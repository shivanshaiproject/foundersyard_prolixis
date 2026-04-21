/**
 * FoundersYard Supreme Shield - Unified Content Moderation System
 * Orchestrates all moderation checks for maximum protection
 * NOW WITH PARANOID MODE (0.5 threshold) + TensorFlow.js AI
 */

import { analyzeTextToxicity, calculateAggressionScore, ToxicityResult } from './textModeration';
import { analyzeToxicityWithTF, TFToxicityResult, shouldBlockContent } from './tfToxicity';
import { checkAgainstWatchlist, WatchlistResult } from './watchlistChecker';
import { moderateImage, ImageModerationResult } from './imageModeration';
import { stripImageMetadata } from './metadataStripper';
import { generateSafetyToken, SafetyTokenPayload } from './safetyToken';
import { supabase } from '@/integrations/supabase/client';

// Political keywords for shadow banning (no 'g' flag to prevent lastIndex issues)
const POLITICAL_KEYWORDS = /\b(election|overthrow|revolution|coup|insurgency|sedition|rebellion)\b/i;

export interface SupremeShieldProgress {
  stage: 'initializing' | 'text_analysis' | 'watchlist_check' | 'image_analysis' | 'metadata_strip' | 'generating_token' | 'complete';
  message: string;
  progress: number; // 0-100
}

export interface SupremeShieldResult {
  allowed: boolean;
  action: 'allow' | 'block' | 'shadow_ban' | 'flag_review';
  safetyToken?: string;
  moderationToken?: string; // New: for backend gate enforcement
  moderationStatus: 'approved' | 'pending_review' | 'shadow_banned' | 'rejected';
  strippedImage?: File;
  isShadowBanned?: boolean; // For political keywords
  
  // Detailed results
  textAnalysis?: ToxicityResult;
  tfAnalysis?: TFToxicityResult;
  watchlistResult?: WatchlistResult;
  imageAnalysis?: ImageModerationResult;
  aggressionScore?: number;
  
  // For error display
  reason?: string;
  userMessage: string;
}

export interface SupremeShieldOptions {
  userId: string;
  text?: string;
  imageFile?: File;
  contentType: SafetyTokenPayload['contentType'];
  onProgress?: (progress: SupremeShieldProgress) => void;
}

// Professional error messages
const USER_MESSAGES = {
  blocked: 'Content Blocked: Professional standards violation.',
  shadow_banned: 'Your post is being reviewed by our team. It will be visible once approved.',
  flagged: 'Your content has been submitted for review. It will be visible shortly.',
  account_restricted: 'Your account posting privileges have been temporarily restricted. Please contact support@foundersyard.in for assistance.',
  success: 'Content approved.',
};

/**
 * Run the complete Supreme Shield scan on content
 * NOW WITH TF.js AI + Political keyword shadow banning
 */
export async function runSupremeShieldScan(options: SupremeShieldOptions): Promise<SupremeShieldResult> {
  const { userId, text, imageFile, contentType, onProgress } = options;
  
  let currentProgress = 0;
  const updateProgress = (stage: SupremeShieldProgress['stage'], message: string, progress: number) => {
    currentProgress = progress;
    onProgress?.({ stage, message, progress });
  };
  
  updateProgress('initializing', 'Initializing Safety Analysis...', 5);
  
  // Check user trust level first
  const trustCheck = await checkUserTrust(userId);
  if (trustCheck.blocked) {
    return {
      allowed: false,
      action: 'block',
      moderationStatus: 'rejected',
      reason: 'Account restricted',
      userMessage: USER_MESSAGES.account_restricted,
    };
  }
  
  let textAnalysis: ToxicityResult | undefined;
  let tfAnalysis: TFToxicityResult | undefined;
  let aggressionScore: number | undefined;
  let watchlistResult: WatchlistResult | undefined;
  let imageAnalysis: ImageModerationResult | undefined;
  let strippedImage: File | undefined;
  let isShadowBanned = false;
  
  // 1. Text Analysis with TensorFlow AI (Paranoid Mode 0.5 threshold)
  if (text && text.trim().length > 0) {
    updateProgress('text_analysis', 'AI Safety Analysis...', 15);
    
    // Run TF.js toxicity analysis first (the primary AI check)
    try {
      tfAnalysis = await analyzeToxicityWithTF(text, (p) => {
        updateProgress('text_analysis', p.message, p.stage === 'loading' ? 20 : 30);
      });
      
      // Zero tolerance: identity_attack, threat, insult > 0.5 = BLOCK
      if (tfAnalysis.isBlocked) {
        await logModerationAttempt(userId, 'tf_blocked', tfAnalysis.detectedCategories, contentType);
        await decreaseUserTrust(userId, 10, 'ai_toxic_content');
        
        return {
          allowed: false,
          action: 'block',
          moderationStatus: 'rejected',
          tfAnalysis,
          reason: tfAnalysis.reason || USER_MESSAGES.blocked,
          userMessage: USER_MESSAGES.blocked,
        };
      }
    } catch (error) {
      console.error('TF toxicity error, falling back to regex:', error);
    }
    
    // Fallback regex analysis
    textAnalysis = analyzeTextToxicity(text);
    aggressionScore = calculateAggressionScore(text);
    
    // Block if regex detects severe toxicity
    if (textAnalysis.isBlocked) {
      await logModerationAttempt(userId, 'text_blocked', textAnalysis.detectedCategories, contentType);
      await decreaseUserTrust(userId, 5, 'toxic_content');
      
      return {
        allowed: false,
        action: 'block',
        moderationStatus: 'rejected',
        textAnalysis,
        tfAnalysis,
        aggressionScore,
        reason: textAnalysis.reason,
        userMessage: USER_MESSAGES.blocked,
      };
    }
    
    // CHECK FOR POLITICAL KEYWORDS - SHADOW BAN
    if (POLITICAL_KEYWORDS.test(text)) {
      isShadowBanned = true;
      await logModerationAttempt(userId, 'political_shadow_ban', ['political_keywords'], contentType);
      await decreaseUserTrust(userId, 5, 'political_content');
    }
    
    // 2. Watchlist Check
    updateProgress('watchlist_check', 'Verifying community guidelines...', 50);
    watchlistResult = await checkAgainstWatchlist(text);
    
    // Block for high-severity watchlist matches
    if (watchlistResult.isBlocked) {
      await logModerationAttempt(userId, 'watchlist_blocked', watchlistResult.matches.map(m => m.phrase), contentType);
      await decreaseUserTrust(userId, 10, 'watchlist_violation');
      
      return {
        allowed: false,
        action: 'block',
        moderationStatus: 'rejected',
        textAnalysis,
        tfAnalysis,
        aggressionScore,
        watchlistResult,
        reason: watchlistResult.reason,
        userMessage: USER_MESSAGES.blocked,
      };
    }
  }
  
  // 3. Image Analysis
  if (imageFile) {
    updateProgress('image_analysis', 'Scanning image content...', 60);
    
    try {
      imageAnalysis = await moderateImage(imageFile, (p) => {
        updateProgress('image_analysis', p.message, 60 + (p.stage === 'complete' ? 15 : 10));
      });
      
      if (imageAnalysis.isBlocked) {
        await logModerationAttempt(userId, 'image_blocked', imageAnalysis.detectedCategories, contentType);
        await decreaseUserTrust(userId, 10, 'explicit_image');
        
        return {
          allowed: false,
          action: 'block',
          moderationStatus: 'rejected',
          textAnalysis,
          aggressionScore,
          watchlistResult,
          imageAnalysis,
          reason: imageAnalysis.reason,
          userMessage: USER_MESSAGES.blocked,
        };
      }
    } catch (error) {
      console.error('Image moderation error:', error);
      // Continue but flag for review
      imageAnalysis = {
        isBlocked: false,
        isFlagged: true,
        scores: { porn: 0, hentai: 0, sexy: 0, neutral: 1, drawing: 0 },
        detectedCategories: ['scan_error'],
        reason: 'Image could not be fully analyzed',
      };
    }
    
    // 4. Strip Metadata
    updateProgress('metadata_strip', 'Securing image metadata...', 80);
    try {
      const strippedResult = await stripImageMetadata(imageFile);
      strippedImage = strippedResult.file;
    } catch (error) {
      console.error('Metadata stripping error:', error);
      strippedImage = imageFile; // Use original if stripping fails
    }
  }
  
  // Determine final action
  let action: SupremeShieldResult['action'] = 'allow';
  let moderationStatus: SupremeShieldResult['moderationStatus'] = 'approved';
  let userMessage = USER_MESSAGES.success;
  
  // Political keywords = automatic shadow ban
  if (isShadowBanned) {
    action = 'shadow_ban';
    moderationStatus = 'shadow_banned';
    userMessage = USER_MESSAGES.shadow_banned;
  }
  // Check for other shadow ban conditions
  else if (
    watchlistResult?.isShadowBanned ||
    (textAnalysis?.isFlagged && aggressionScore && aggressionScore > 0.5) ||
    (watchlistResult?.matches && watchlistResult.matches.length >= 2) ||
    (tfAnalysis?.isFlagged)
  ) {
    action = 'shadow_ban';
    moderationStatus = 'shadow_banned';
    userMessage = USER_MESSAGES.shadow_banned;
    isShadowBanned = true;
    await logModerationAttempt(userId, 'shadow_banned', 
      [...(textAnalysis?.detectedCategories || []), ...(watchlistResult?.matches.map(m => m.phrase) || [])], 
      contentType);
    await decreaseUserTrust(userId, 3, 'shadow_ban');
  }
  // Check for flag conditions
  else if (textAnalysis?.isFlagged || watchlistResult?.isFlagged || imageAnalysis?.isFlagged) {
    action = 'flag_review';
    moderationStatus = 'pending_review';
    userMessage = USER_MESSAGES.flagged;
  }
  
  // 5. Generate Safety Token (moderation_token)
  updateProgress('generating_token', 'Finalizing security verification...', 90);
  
  let safetyToken: string | undefined;
  let moderationToken: string | undefined;
  try {
    const tokenResult = await generateSafetyToken(
      userId,
      text || '',
      contentType,
      {
        visual: !imageAnalysis?.isBlocked && !imageAnalysis?.isFlagged,
        toxicity: !textAnalysis?.isBlocked && !textAnalysis?.isFlagged && !tfAnalysis?.isBlocked,
        watchlist: !watchlistResult?.isBlocked && !watchlistResult?.isShadowBanned,
      }
    );
    safetyToken = tokenResult.token;
    moderationToken = tokenResult.token; // Use same token as moderation_token
  } catch (error) {
    console.error('Token generation error:', error);
    // Continue without token - server will handle this
  }
  
  updateProgress('complete', 'Safety analysis complete', 100);
  
  // Log successful moderation for good actors
  if (action === 'allow') {
    await increaseUserTrust(userId, 1);
  }
  
  return {
    allowed: action === 'allow' || action === 'shadow_ban' || action === 'flag_review',
    action,
    safetyToken,
    moderationToken,
    moderationStatus,
    strippedImage,
    isShadowBanned,
    textAnalysis,
    tfAnalysis,
    watchlistResult,
    imageAnalysis,
    aggressionScore,
    userMessage,
  };
}

// Helper functions

async function checkUserTrust(userId: string): Promise<{ blocked: boolean; trustLevel: number }> {
  try {
    const { data } = await supabase
      .from('user_reputation')
      .select('trust_level')
      .eq('user_id', userId)
      .single();
    
    const trustLevel = data?.trust_level ?? 50;
    return {
      blocked: trustLevel < 10,
      trustLevel,
    };
  } catch {
    return { blocked: false, trustLevel: 50 };
  }
}

async function decreaseUserTrust(userId: string, amount: number, violationType: string): Promise<void> {
  try {
    await supabase.rpc('decrease_user_trust', {
      p_user_id: userId,
      p_amount: amount,
      p_violation_type: violationType,
    });
  } catch (error) {
    console.error('Failed to decrease user trust:', error);
  }
}

async function increaseUserTrust(userId: string, amount: number): Promise<void> {
  try {
    await supabase.rpc('increase_user_trust', {
      p_user_id: userId,
      p_amount: amount,
    });
  } catch (error) {
    console.error('Failed to increase user trust:', error);
  }
}

async function logModerationAttempt(
  userId: string,
  actionTaken: string,
  detectedCategories: string[],
  contentType: string
): Promise<void> {
  try {
    await supabase.from('moderation_logs').insert({
      user_id: userId,
      action_taken: actionTaken,
      reason: detectedCategories.join(', '),
      detected_categories: detectedCategories,
      content_type: contentType,
    });
  } catch (error) {
    console.error('Failed to log moderation attempt:', error);
  }
}

// Export utility for quick text-only check (for comments, replies)
export async function quickTextCheck(text: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const toxicity = analyzeTextToxicity(text);
  if (toxicity.isBlocked) {
    return { allowed: false, reason: toxicity.reason };
  }
  
  const watchlist = await checkAgainstWatchlist(text);
  if (watchlist.isBlocked) {
    return { allowed: false, reason: watchlist.reason };
  }
  
  return { allowed: true };
}
