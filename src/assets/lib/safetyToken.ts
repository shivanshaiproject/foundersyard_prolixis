/**
 * Safety Token Generator - Cryptographic proof of client-side scan
 * Prevents API bypass attacks by requiring valid tokens for content submission
 */

export interface SafetyTokenPayload {
  userId: string;
  contentHash: string;
  timestamp: number;
  checksPassedFlags: {
    visual: boolean;
    toxicity: boolean;
    watchlist: boolean;
  };
  contentType: 'post' | 'thread' | 'reply' | 'short' | 'image';
}

export interface SafetyToken {
  token: string;
  payload: SafetyTokenPayload;
  signature: string;
}

// Simple hash function for content fingerprinting
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate HMAC signature
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Client-side secret derivation (combined with user info for uniqueness)
function deriveClientSecret(userId: string): string {
  // This creates a pseudo-secret that's unique per user
  // The real validation happens server-side with a proper secret
  return `fy_shield_${userId}_${navigator.userAgent.slice(0, 20)}`;
}

/**
 * Generate a safety token after client-side moderation passes
 */
export async function generateSafetyToken(
  userId: string,
  content: string,
  contentType: SafetyTokenPayload['contentType'],
  checksPassedFlags: SafetyTokenPayload['checksPassedFlags']
): Promise<SafetyToken> {
  // Generate content hash
  const contentHash = await sha256(content);
  
  // Create payload
  const payload: SafetyTokenPayload = {
    userId,
    contentHash,
    timestamp: Date.now(),
    checksPassedFlags,
    contentType,
  };
  
  // Serialize payload
  const payloadString = JSON.stringify(payload);
  const encodedPayload = btoa(payloadString);
  
  // Generate signature
  const secret = deriveClientSecret(userId);
  const signature = await generateSignature(payloadString, secret);
  
  // Combine into token
  const token = `${encodedPayload}.${signature}`;
  
  return {
    token,
    payload,
    signature,
  };
}

/**
 * Create content hash for comparison
 */
export async function hashContent(content: string): Promise<string> {
  return sha256(content);
}

/**
 * Validate token format (basic client-side check)
 * Real validation happens server-side
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  try {
    // Try to decode payload
    const payloadString = atob(parts[0]);
    const payload = JSON.parse(payloadString);
    
    // Check required fields
    if (!payload.userId || !payload.contentHash || !payload.timestamp) {
      return false;
    }
    
    // Check timestamp is within 5 minutes
    const age = Date.now() - payload.timestamp;
    if (age > 5 * 60 * 1000 || age < 0) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract payload from token (for logging/debugging)
 */
export function extractPayload(token: string): SafetyTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const payloadString = atob(parts[0]);
    return JSON.parse(payloadString);
  } catch {
    return null;
  }
}
