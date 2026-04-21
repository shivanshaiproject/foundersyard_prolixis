import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

// NSFW categories and thresholds
export interface ModerationResult {
  isBlocked: boolean;
  isFlagged: boolean;
  categories: {
    porn: number;
    hentai: number;
    sexy: number;
    neutral: number;
    drawing: number;
  };
  maxScore: number;
  reason: string | null;
  frameResults: FrameResult[];
}

export interface FrameResult {
  frameIndex: number;
  timestamp: number;
  categories: Record<string, number>;
}

export interface ModerationProgress {
  stage: 'loading' | 'extracting' | 'analyzing' | 'complete';
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
  message: string;
}

// STRICT Thresholds for content blocking (Paranoid Mode)
const BLOCK_THRESHOLDS = {
  porn: 0.3,    // Lowered from 0.4
  hentai: 0.1,  // Lowered from 0.2
};

const FLAG_THRESHOLDS = {
  sexy: 0.6,    // Lowered from 0.7
};

// Singleton model instance
let nsfwModel: nsfwjs.NSFWJS | null = null;
let modelLoading: Promise<nsfwjs.NSFWJS> | null = null;

/**
 * Load the NSFW model (lazy, cached) - uses bundled models to avoid CORS issues
 */
export async function loadModerationModel(
  onProgress?: (progress: ModerationProgress) => void
): Promise<nsfwjs.NSFWJS> {
  if (nsfwModel) {
    return nsfwModel;
  }

  if (modelLoading) {
    return modelLoading;
  }

  onProgress?.({
    stage: 'loading',
    progress: 0,
    message: 'Loading AI safety model...',
  });

  modelLoading = (async () => {
    // Set TensorFlow.js backend
    await tf.ready();
    
    try {
      // Use bundled InceptionV3 model (most accurate, no CORS issues)
      const model = await nsfwjs.load('InceptionV3', { size: 299 });
      nsfwModel = model;
      
      onProgress?.({
        stage: 'loading',
        progress: 100,
        message: 'AI model loaded',
      });
      
      return model;
    } catch (primaryError) {
      console.warn('InceptionV3 failed to load, trying MobileNetV2 fallback:', primaryError);
      
      try {
        // Fallback to MobileNetV2 (smaller but still effective)
        const model = await nsfwjs.load('MobileNetV2');
        nsfwModel = model;
        
        onProgress?.({
          stage: 'loading',
          progress: 100,
          message: 'AI model loaded (fallback)',
        });
        
        return model;
      } catch (fallbackError) {
        console.error('All NSFW models failed to load:', fallbackError);
        modelLoading = null; // Reset so retry is possible
        throw new Error('Content safety model unavailable. Please refresh and try again.');
      }
    }
  })();

  return modelLoading;
}

/**
 * Extract frames from video at specified percentages
 */
async function extractVideoFrames(
  videoFile: File,
  framePercentages: number[],
  onProgress?: (progress: ModerationProgress) => void
): Promise<HTMLImageElement[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const frames: HTMLImageElement[] = [];
    let currentFrameIndex = 0;

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      
      // Set canvas size based on video dimensions
      canvas.width = 299; // NSFW model input size
      canvas.height = 299;

      const extractFrame = (percentage: number): Promise<HTMLImageElement> => {
        return new Promise((resolveFrame, rejectFrame) => {
          const time = (duration * percentage) / 100;
          video.currentTime = time;

          video.onseeked = () => {
            try {
              // Draw video frame to canvas, scaled to 299x299
              ctx.drawImage(video, 0, 0, 299, 299);
              
              // Convert to image
              const img = new Image();
              img.onload = () => resolveFrame(img);
              img.onerror = () => rejectFrame(new Error('Failed to create frame image'));
              img.src = canvas.toDataURL('image/jpeg', 0.8);
            } catch (e) {
              rejectFrame(e);
            }
          };
        });
      };

      try {
        for (const percentage of framePercentages) {
          onProgress?.({
            stage: 'extracting',
            progress: Math.round((currentFrameIndex / framePercentages.length) * 100),
            currentFrame: currentFrameIndex + 1,
            totalFrames: framePercentages.length,
            message: `Extracting frame ${currentFrameIndex + 1}/${framePercentages.length}...`,
          });

          const frame = await extractFrame(percentage);
          frames.push(frame);
          currentFrameIndex++;
        }

        // Cleanup
        URL.revokeObjectURL(video.src);
        resolve(frames);
      } catch (e) {
        URL.revokeObjectURL(video.src);
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Analyze a single frame with the NSFW model
 */
async function analyzeFrame(
  model: nsfwjs.NSFWJS,
  frame: HTMLImageElement
): Promise<Record<string, number>> {
  const predictions = await model.classify(frame);
  
  const result: Record<string, number> = {};
  for (const prediction of predictions) {
    result[prediction.className.toLowerCase()] = prediction.probability;
  }
  
  return result;
}

/**
 * Main moderation function - analyzes video for inappropriate content
 */
export async function moderateVideo(
  videoFile: File,
  onProgress?: (progress: ModerationProgress) => void
): Promise<ModerationResult> {
  // Frame extraction points (percentage of video duration)
  const framePercentages = [10, 25, 40, 55, 70, 85, 95];
  
  // Load model
  const model = await loadModerationModel(onProgress);
  
  // Extract frames
  onProgress?.({
    stage: 'extracting',
    progress: 0,
    message: 'Preparing video for analysis...',
  });
  
  const frames = await extractVideoFrames(videoFile, framePercentages, onProgress);
  
  // Analyze frames in parallel
  onProgress?.({
    stage: 'analyzing',
    progress: 0,
    message: 'Scanning for content safety...',
  });
  
  const frameResults: FrameResult[] = [];
  const analysisPromises = frames.map(async (frame, index) => {
    const categories = await analyzeFrame(model, frame);
    return {
      frameIndex: index,
      timestamp: (framePercentages[index] / 100) * videoFile.size, // Approximate
      categories,
    };
  });

  // Process with progress updates
  let completed = 0;
  for (const promise of analysisPromises) {
    const result = await promise;
    frameResults.push(result);
    completed++;
    
    onProgress?.({
      stage: 'analyzing',
      progress: Math.round((completed / frames.length) * 100),
      currentFrame: completed,
      totalFrames: frames.length,
      message: `Analyzing frame ${completed}/${frames.length}...`,
    });
  }

  // Aggregate results
  let isBlocked = false;
  let isFlagged = false;
  let maxScore = 0;
  let reason: string | null = null;
  
  const aggregatedCategories = {
    porn: 0,
    hentai: 0,
    sexy: 0,
    neutral: 0,
    drawing: 0,
  };

  for (const result of frameResults) {
    // Check block thresholds
    if (result.categories.porn > BLOCK_THRESHOLDS.porn) {
      isBlocked = true;
      reason = 'Explicit adult content detected';
      maxScore = Math.max(maxScore, result.categories.porn);
    }
    
    if (result.categories.hentai > BLOCK_THRESHOLDS.hentai) {
      isBlocked = true;
      reason = 'Animated adult content detected';
      maxScore = Math.max(maxScore, result.categories.hentai);
    }
    
    // Check flag thresholds
    if (!isBlocked && result.categories.sexy > FLAG_THRESHOLDS.sexy) {
      isFlagged = true;
      reason = 'Suggestive content - requires review';
      maxScore = Math.max(maxScore, result.categories.sexy);
    }
    
    // Track max values for each category
    aggregatedCategories.porn = Math.max(aggregatedCategories.porn, result.categories.porn || 0);
    aggregatedCategories.hentai = Math.max(aggregatedCategories.hentai, result.categories.hentai || 0);
    aggregatedCategories.sexy = Math.max(aggregatedCategories.sexy, result.categories.sexy || 0);
    aggregatedCategories.neutral = Math.max(aggregatedCategories.neutral, result.categories.neutral || 0);
    aggregatedCategories.drawing = Math.max(aggregatedCategories.drawing, result.categories.drawing || 0);
  }

  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: isBlocked ? 'Content violation detected' : isFlagged ? 'Content flagged for review' : 'Content approved',
  });

  return {
    isBlocked,
    isFlagged,
    categories: aggregatedCategories,
    maxScore,
    reason,
    frameResults,
  };
}

/**
 * Pre-scan validation (before AI analysis)
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateVideoMetadata(videoFile: File): Promise<ValidationResult> {
  // Check file size (max 500MB, but 50MB for quick scan requirement)
  if (videoFile.size > 500 * 1024 * 1024) {
    return { isValid: false, error: 'File size exceeds 500MB limit' };
  }

  // Check video duration
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);

      if (duration > 60) {
        resolve({ isValid: false, error: 'Video duration exceeds 60 seconds' });
        return;
      }

      if (duration < 3) {
        resolve({ isValid: false, error: 'Video must be at least 3 seconds long' });
        return;
      }

      resolve({ isValid: true });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ isValid: false, error: 'Invalid video file' });
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Log moderation attempt to database
 */
export async function logModerationAttempt(
  supabase: any,
  userId: string,
  result: ModerationResult,
  videoFilename: string,
  shortId?: string
): Promise<void> {
  try {
    await supabase.from('moderation_logs').insert({
      user_id: userId,
      short_id: shortId || null,
      reason: result.reason || 'Content scan completed',
      confidence_score: result.maxScore,
      detected_categories: result.categories,
      video_filename: videoFilename,
      action_taken: result.isBlocked ? 'blocked' : result.isFlagged ? 'flagged' : 'allowed',
    });
  } catch (error) {
    console.error('Failed to log moderation attempt:', error);
  }
}

/**
 * Check if user has too many blocked uploads (for auto-strike)
 */
export async function checkUserModerationHistory(
  supabase: any,
  userId: string
): Promise<{ blockedCount: number; shouldAutoStrike: boolean }> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data, error } = await supabase
      .from('moderation_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('action_taken', 'blocked')
      .gte('created_at', oneDayAgo.toISOString());

    if (error) throw error;

    const blockedCount = data?.length || 0;
    return {
      blockedCount,
      shouldAutoStrike: blockedCount >= 3,
    };
  } catch (error) {
    console.error('Failed to check moderation history:', error);
    return { blockedCount: 0, shouldAutoStrike: false };
  }
}
