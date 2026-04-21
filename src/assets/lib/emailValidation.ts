/**
 * Email validation utilities to block disposable/temporary email providers
 * and validate email format
 */

// List of known disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'mailinator.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'maildrop.cc',
  'getnada.com',
  'fakeinbox.com',
  'sharklasers.com',
  'grr.la',
  'dispostable.com',
  'temp-mail.org',
  'tempail.com',
  'mohmal.com',
  'emailondeck.com',
  'minuteinbox.com',
  '10minmail.com',
  'tempmailaddress.com',
  'tmpmail.org',
  'tmpmail.net',
  'throwawaymail.com',
  'mailnesia.com',
  'mailcatch.com',
  'spambox.us',
  'tempinbox.com',
  'jetable.org',
  'incognitomail.org',
  'spamgourmet.com',
  'mytrashmail.com',
  'kasmail.com',
  'spamfree24.org',
  'mailexpire.com',
  'maileater.com',
  'spamex.com',
  'safetymail.info',
  'deadaddress.com',
  'tempsky.com',
  'bugmenot.com',
  'tempr.email',
  'discard.email',
  'emailsensei.com',
  'anonbox.net',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillaomelette.com'
];

/**
 * Check if an email domain is a known disposable email provider
 */
export const isDisposableEmail = (email: string): boolean => {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

/**
 * Validate email format
 */
export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Enhanced email domain validation
 * Blocks localhost, IP addresses, invalid TLDs
 */
const isValidEmailDomain = (email: string): { valid: boolean; error?: string } => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Block localhost and .local domains
  if (domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.localdomain')) {
    return { valid: false, error: 'Invalid email domain' };
  }

  // Block IP addresses as domains
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain) || /^\[.*\]$/.test(domain)) {
    return { valid: false, error: 'Email domain cannot be an IP address' };
  }

  // Block double dots
  if (domain.includes('..')) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validate TLD (must be at least 2 characters)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'Invalid top-level domain' };
  }

  // Block numeric-only TLDs
  if (/^\d+$/.test(tld)) {
    return { valid: false, error: 'Invalid top-level domain' };
  }

  return { valid: true };
};

/**
 * Comprehensive email validation
 * Returns { valid: boolean, error?: string }
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check format
  if (!isValidEmailFormat(trimmedEmail)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Enhanced domain validation
  const domainCheck = isValidEmailDomain(trimmedEmail);
  if (!domainCheck.valid) {
    return domainCheck;
  }

  // Check for disposable email
  if (isDisposableEmail(trimmedEmail)) {
    return { 
      valid: false, 
      error: 'Temporary email addresses are not allowed. Please use a permanent email.' 
    };
  }

  // Check length
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  return { valid: true };
};

/**
 * Password reset rate limiting (client-side)
 * Returns time remaining in milliseconds if rate limited, 0 if allowed
 */
const PASSWORD_RESET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const PASSWORD_RESET_STORAGE_KEY = 'fy_last_password_reset';

export const checkPasswordResetRateLimit = (): { 
  allowed: boolean; 
  remainingMs: number;
  remainingMinutes: number;
} => {
  try {
    const lastReset = localStorage.getItem(PASSWORD_RESET_STORAGE_KEY);
    if (!lastReset) {
      return { allowed: true, remainingMs: 0, remainingMinutes: 0 };
    }

    const timeSince = Date.now() - parseInt(lastReset, 10);
    if (timeSince >= PASSWORD_RESET_COOLDOWN_MS) {
      return { allowed: true, remainingMs: 0, remainingMinutes: 0 };
    }

    const remainingMs = PASSWORD_RESET_COOLDOWN_MS - timeSince;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { allowed: false, remainingMs, remainingMinutes };
  } catch {
    // If localStorage fails, allow the request
    return { allowed: true, remainingMs: 0, remainingMinutes: 0 };
  }
};

export const recordPasswordResetRequest = (): void => {
  try {
    localStorage.setItem(PASSWORD_RESET_STORAGE_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
};
