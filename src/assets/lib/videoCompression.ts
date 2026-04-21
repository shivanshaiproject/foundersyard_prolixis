/**
 * Video compression utilities for client-side processing
 * Uses canvas and MediaRecorder for re-encoding
 */

export interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const MAX_DIMENSION = 1080;
const TARGET_BITRATE = 2_500_000; // 2.5 Mbps for good quality shorts

export async function compressVideo(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video...' });

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      try {
        const { videoWidth, videoHeight } = video;
        
        // Calculate new dimensions maintaining aspect ratio
        let width = videoWidth;
        let height = videoHeight;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Ensure dimensions are even (required for some codecs)
        width = Math.floor(width / 2) * 2;
        height = Math.floor(height / 2) * 2;

        const duration = video.duration;
        
        // Skip compression if already small enough
        if (file.size < 10 * 1024 * 1024 && width === videoWidth && height === videoHeight) {
          URL.revokeObjectURL(objectUrl);
          onProgress?.({ stage: 'complete', progress: 100, message: 'Video already optimized' });
          resolve({
            blob: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1
          });
          return;
        }

        onProgress?.({ stage: 'compressing', progress: 10, message: 'Setting up encoder...' });

        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Use MediaRecorder for encoding
        const stream = canvas.captureStream(30);
        
        // Try different codecs in order of preference
        const codecs = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        
        let mimeType = 'video/webm';
        for (const codec of codecs) {
          if (MediaRecorder.isTypeSupported(codec)) {
            mimeType = codec;
            break;
          }
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: TARGET_BITRATE
        });

        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(objectUrl);
          const blob = new Blob(chunks, { type: mimeType });
          
          onProgress?.({ stage: 'complete', progress: 100, message: 'Compression complete!' });
          
          resolve({
            blob,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: file.size / blob.size
          });
        };

        recorder.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Recording failed'));
        };

        // Start recording
        recorder.start(100);

        // Play and render video frame by frame
        video.currentTime = 0;
        
        const renderFrame = () => {
          if (video.paused || video.ended) {
            recorder.stop();
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          
          const progress = Math.min(95, 10 + (video.currentTime / duration) * 85);
          onProgress?.({ 
            stage: 'compressing', 
            progress, 
            message: `Compressing... ${Math.round(progress)}%` 
          });
          
          requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
          recorder.stop();
        };

        video.onplay = () => {
          renderFrame();
        };

        await video.play();
        
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        onProgress?.({ stage: 'error', progress: 0, message: 'Compression failed' });
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video'));
    };

    video.src = objectUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
