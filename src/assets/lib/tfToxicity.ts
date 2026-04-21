/**
 * TensorFlow.js Toxicity Detection - Paranoid Mode (0.5 threshold)
 * Real AI-powered toxicity detection for zero tolerance moderation
 */

import * as toxicity from '@tensorflow-models/toxicity';
import '@tensorflow/tfjs';

// Paranoid threshold - very strict (0.5 instead of default 0.85)
const TOXICITY_THRESHOLD = 0.5;

// Labels to detect
const LABELS_TO_DETECT = [
  'identity_attack',
  'insult', 
  'threat',
  'severe_toxicity',
  'toxicity',
];

// Categories that trigger immediate block at 0.5 threshold
const ZERO_TOLERANCE_CATEGORIES = ['identity_attack', 'insult', 'threat'];

// Singleton model instance
let modelInstance: toxicity.ToxicityClassifier | null = null;
let modelLoading: Promise<toxicity.ToxicityClassifier> | null = null;

// Flag to prevent repeated load attempts after CSP/network failure
let modelUnavailable = false;

export interface TFToxicityResult {
  isBlocked: boolean;
  isFlagged: boolean;
  scores: Record<string, number>;
  detectedCategories: string[];
  reason?: string;
  modelUsed: boolean;
}

export interface TFToxicityProgress {
  stage: 'loading' | 'analyzing' | 'complete';
  message: string;
}

/**
 * Load the TensorFlow toxicity model (lazy loaded, singleton)
 */
export async function loadToxicityModel(
  onProgress?: (progress: TFToxicityProgress) => void
): Promise<toxicity.ToxicityClassifier> {
  // Return existing instance
  if (modelInstance) {
    return modelInstance;
  }

  // If model failed to load previously (CSP blocked, network error), don't retry
  if (modelUnavailable) {
    throw new Error('Model unavailable due to previous load failure');
  }

  // Wait for in-progress load
  if (modelLoading) {
    return modelLoading;
  }

  // Start loading
  onProgress?.({ stage: 'loading', message: 'Loading AI moderation model...' });

  modelLoading = toxicity.load(TOXICITY_THRESHOLD, LABELS_TO_DETECT).then((model) => {
    modelInstance = model;
    modelLoading = null;
    onProgress?.({ stage: 'complete', message: 'Model loaded' });
    return model;
  }).catch((error) => {
    modelLoading = null;
    
    // Check if this is a CSP or network error - mark model as unavailable
    const errorMessage = String(error?.message || error || '');
    if (
      errorMessage.includes('Content Security Policy') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('net::ERR')
    ) {
      console.warn('TF Toxicity model blocked by CSP or network. Falling back to regex-only moderation.');
      modelUnavailable = true;
    } else {
      console.error('Failed to load toxicity model:', error);
    }
    
    throw error;
  });

  return modelLoading;
}

/**
 * Analyze text using TensorFlow toxicity model
 * Uses Paranoid Mode with 0.5 threshold
 */
export async function analyzeToxicityWithTF(
  text: string,
  onProgress?: (progress: TFToxicityProgress) => void
): Promise<TFToxicityResult> {
  // Empty text is safe
  if (!text || text.trim().length === 0) {
    return {
      isBlocked: false,
      isFlagged: false,
      scores: {},
      detectedCategories: [],
      modelUsed: false,
    };
  }

  // If model is unavailable (CSP blocked), return fallback immediately
  if (modelUnavailable) {
    return {
      isBlocked: false,
      isFlagged: false,
      scores: {},
      detectedCategories: [],
      modelUsed: false,
    };
  }

  try {
    onProgress?.({ stage: 'loading', message: 'Initializing safety scan...' });
    const model = await loadToxicityModel(onProgress);

    onProgress?.({ stage: 'analyzing', message: 'Analyzing content...' });
    const predictions = await model.classify([text]);

    const scores: Record<string, number> = {};
    const detectedCategories: string[] = [];
    let isBlocked = false;
    let isFlagged = false;
    let blockReason = '';

    for (const prediction of predictions) {
      const label = prediction.label;
      const results = prediction.results[0];
      
      // Get the probability of being toxic (match = true)
      const toxicScore = results.probabilities[1]; // Index 1 is probability of match
      scores[label] = toxicScore;

      // Check if this category should block
      if (ZERO_TOLERANCE_CATEGORIES.includes(label) && toxicScore >= TOXICITY_THRESHOLD) {
        isBlocked = true;
        detectedCategories.push(label);
        blockReason = 'Content Blocked: Professional standards violation.';
      } else if (toxicScore >= TOXICITY_THRESHOLD) {
        isFlagged = true;
        if (!detectedCategories.includes(label)) {
          detectedCategories.push(label);
        }
      } else if (toxicScore >= 0.4) {
        // Flag borderline content for review
        isFlagged = true;
        if (!detectedCategories.includes(label)) {
          detectedCategories.push(label);
        }
      }
    }

    onProgress?.({ stage: 'complete', message: 'Analysis complete' });

    return {
      isBlocked,
      isFlagged,
      scores,
      detectedCategories,
      reason: blockReason || undefined,
      modelUsed: true,
    };
  } catch (error) {
    // Don't log CSP errors repeatedly - they're expected when blocked
    if (!modelUnavailable) {
      console.error('TF Toxicity analysis error:', error);
    }
    // Return safe result on error - don't block legitimate posts due to model failure
    return {
      isBlocked: false,
      isFlagged: false,
      scores: {},
      detectedCategories: [],
      modelUsed: false,
    };
  }
}

/**
 * Quick check if TF toxicity model is loaded
 */
export function isModelLoaded(): boolean {
  return modelInstance !== null;
}

/**
 * Check if model is unavailable (CSP blocked)
 */
export function isModelUnavailable(): boolean {
  return modelUnavailable;
}

/**
 * Preload the model (call on component mount for faster first scan)
 */
export function preloadModel(): void {
  // Skip if model is unavailable (CSP blocked)
  if (modelUnavailable) {
    return;
  }
  
  loadToxicityModel().catch(() => {
    // Silent fail - model will be loaded on first use or marked unavailable
  });
}

/**
 * Check if content should be blocked based on TF analysis
 * Zero tolerance for identity_attack, threat, insult > 0.5
 */
export function shouldBlockContent(scores: Record<string, number>): {
  blocked: boolean;
  reason?: string;
  category?: string;
} {
  for (const category of ZERO_TOLERANCE_CATEGORIES) {
    const score = scores[category];
    if (score !== undefined && score >= TOXICITY_THRESHOLD) {
      return {
        blocked: true,
        reason: 'Content Blocked: Professional standards violation.',
        category,
      };
    }
  }

  return { blocked: false };
}
