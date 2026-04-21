/**
 * Metadata Stripper - Remove EXIF data and GPS locations from images
 * Protects founder privacy by stripping all metadata before upload
 */

export interface StrippedImageResult {
  file: File;
  originalSize: number;
  strippedSize: number;
  metadataRemoved: boolean;
}

/**
 * Strip all EXIF metadata from an image by re-encoding through canvas
 * This completely removes GPS, camera info, timestamps, etc.
 */
export async function stripImageMetadata(file: File): Promise<StrippedImageResult> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize: file.size,
      strippedSize: file.size,
      metadataRemoved: false,
    };
  }
  
  // Skip SVG files (no EXIF data)
  if (file.type === 'image/svg+xml') {
    return {
      file,
      originalSize: file.size,
      strippedSize: file.size,
      metadataRemoved: false,
    };
  }
  
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      try {
        // Create canvas with image dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }
        
        // Draw image to canvas (this strips all metadata)
        ctx.drawImage(img, 0, 0);
        
        // Determine output format and quality
        let outputType = file.type;
        let quality = 0.92;
        
        // Convert PNG with transparency to PNG, otherwise use JPEG for smaller size
        if (file.type === 'image/png') {
          // Check if image has transparency
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hasTransparency = checkForTransparency(imageData);
          
          if (!hasTransparency) {
            outputType = 'image/jpeg';
            quality = 0.92;
          }
        } else if (file.type === 'image/gif') {
          // Keep GIF as PNG (canvas doesn't support GIF output)
          outputType = 'image/png';
        } else {
          outputType = 'image/jpeg';
        }
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create stripped image'));
              return;
            }
            
            // Create new file with original name
            const strippedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });
            
            resolve({
              file: strippedFile,
              originalSize,
              strippedSize: strippedFile.size,
              metadataRemoved: true,
            });
          },
          outputType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for metadata stripping'));
    };
    
    img.src = url;
  });
}

/**
 * Check if image data contains any transparent pixels
 */
function checkForTransparency(imageData: ImageData): boolean {
  const data = imageData.data;
  
  // Check every 100th pixel for performance (sampling)
  for (let i = 3; i < data.length; i += 400) {
    if (data[i] < 255) {
      return true;
    }
  }
  
  return false;
}

/**
 * Batch process multiple images
 */
export async function stripMultipleImages(files: File[]): Promise<StrippedImageResult[]> {
  const results: StrippedImageResult[] = [];
  
  for (const file of files) {
    try {
      const result = await stripImageMetadata(file);
      results.push(result);
    } catch (error) {
      console.error('Error stripping metadata from:', file.name, error);
      // Return original file if stripping fails
      results.push({
        file,
        originalSize: file.size,
        strippedSize: file.size,
        metadataRemoved: false,
      });
    }
  }
  
  return results;
}

/**
 * Calculate total size savings from metadata stripping
 */
export function calculateSavings(results: StrippedImageResult[]): {
  totalOriginal: number;
  totalStripped: number;
  savedBytes: number;
  savedPercentage: number;
} {
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalStripped = results.reduce((sum, r) => sum + r.strippedSize, 0);
  const savedBytes = totalOriginal - totalStripped;
  const savedPercentage = totalOriginal > 0 ? (savedBytes / totalOriginal) * 100 : 0;
  
  return {
    totalOriginal,
    totalStripped,
    savedBytes,
    savedPercentage,
  };
}
