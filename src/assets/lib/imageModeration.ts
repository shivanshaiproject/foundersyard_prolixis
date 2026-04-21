/**
 * Image Moderation - NSFW Detection for Static Images
 * Uses nsfwjs for client-side image analysis
 */

import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

export interface ImageModerationResult {
  isBlocked: boolean;
  isFlagged: boolean;
  scores: {
    porn: number;
    hentai: number;
    sexy: number;
    neutral: number;
    drawing: number;
  };
  detectedCategories: string[];
  reason?: string;
}

export interface ImageModerationProgress {
  stage: 'loading' | 'analyzing' | 'complete';
  message: string;
}

// Stricter thresholds for the Supreme Shield
const BLOCK_THRESHOLDS = {
  porn: 0.3,    // Lower threshold = more strict
  hentai: 0.1,  // Very low tolerance
};

const FLAG_THRESHOLDS = {
  sexy: 0.6,
};

let model: nsfwjs.NSFWJS | null = null;
let isLoading = false;

// Load model with retry logic
async function loadModel(onProgress?: (progress: ImageModerationProgress) => void): Promise<nsfwjs.NSFWJS> {
  if (model) return model;
  
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (model) return model;
  }
  
  isLoading = true;
  onProgress?.({ stage: 'loading', message: 'Loading safety model...' });
  
  try {
    // Set TensorFlow backend
    await tf.ready();
    
    // Load the Inception model (more accurate)
    model = await nsfwjs.load('InceptionV3');
    return model;
  } catch (error) {
    console.error('Failed to load NSFW model:', error);
    throw new Error('Failed to initialize image safety scanner');
  } finally {
    isLoading = false;
  }
}

// Convert File to HTMLImageElement
async function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for analysis'));
    };
    
    img.src = url;
  });
}

// Analyze a single image
export async function moderateImage(
  file: File,
  onProgress?: (progress: ImageModerationProgress) => void
): Promise<ImageModerationResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Load model
  const nsfwModel = await loadModel(onProgress);
  
  onProgress?.({ stage: 'analyzing', message: 'Analyzing image content...' });
  
  // Convert file to image element
  const img = await fileToImage(file);
  
  // Run prediction
  const predictions = await nsfwModel.classify(img);
  
  // Convert predictions to scores object
  const scores = {
    porn: 0,
    hentai: 0,
    sexy: 0,
    neutral: 0,
    drawing: 0,
  };
  
  for (const pred of predictions) {
    const className = pred.className.toLowerCase() as keyof typeof scores;
    if (className in scores) {
      scores[className] = pred.probability;
    }
  }
  
  // Determine if blocked or flagged
  const detectedCategories: string[] = [];
  let isBlocked = false;
  let isFlagged = false;
  let reason = '';
  
  // Check blocking thresholds
  if (scores.porn >= BLOCK_THRESHOLDS.porn) {
    isBlocked = true;
    detectedCategories.push('explicit content');
    reason = 'Image contains explicit adult content';
  }
  
  if (scores.hentai >= BLOCK_THRESHOLDS.hentai) {
    isBlocked = true;
    detectedCategories.push('explicit animated content');
    reason = 'Image contains explicit animated content';
  }
  
  // Check flagging thresholds
  if (!isBlocked && scores.sexy >= FLAG_THRESHOLDS.sexy) {
    isFlagged = true;
    detectedCategories.push('suggestive content');
    reason = 'Image may contain suggestive content';
  }
  
  onProgress?.({ stage: 'complete', message: 'Analysis complete' });
  
  return {
    isBlocked,
    isFlagged,
    scores,
    detectedCategories,
    reason: reason || undefined,
  };
}

// Batch analyze multiple images
export async function moderateImages(
  files: File[],
  onProgress?: (progress: ImageModerationProgress & { current: number; total: number }) => void
): Promise<ImageModerationResult[]> {
  const results: ImageModerationResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    onProgress?.({
      stage: 'analyzing',
      message: `Analyzing image ${i + 1} of ${files.length}...`,
      current: i + 1,
      total: files.length,
    });
    
    try {
      const result = await moderateImage(file);
      results.push(result);
      
      // If any image is blocked, we can short-circuit
      if (result.isBlocked) {
        // Still return all results so far for logging
        return results;
      }
    } catch (error) {
      console.error(`Error analyzing image ${i + 1}:`, error);
      // Continue with other images
      results.push({
        isBlocked: false,
        isFlagged: true,
        scores: { porn: 0, hentai: 0, sexy: 0, neutral: 1, drawing: 0 },
        detectedCategories: ['analysis_error'],
        reason: 'Failed to analyze image',
      });
    }
  }
  
  onProgress?.({
    stage: 'complete',
    message: 'All images analyzed',
    current: files.length,
    total: files.length,
  });
  
  return results;
}

// Check if any result in batch is blocked or flagged
export function summarizeImageResults(results: ImageModerationResult[]): {
  anyBlocked: boolean;
  anyFlagged: boolean;
  blockedReasons: string[];
  flaggedReasons: string[];
} {
  const blockedResults = results.filter(r => r.isBlocked);
  const flaggedResults = results.filter(r => r.isFlagged && !r.isBlocked);
  
  return {
    anyBlocked: blockedResults.length > 0,
    anyFlagged: flaggedResults.length > 0,
    blockedReasons: blockedResults.map(r => r.reason || 'Explicit content detected'),
    flaggedReasons: flaggedResults.map(r => r.reason || 'Content flagged for review'),
  };
}
