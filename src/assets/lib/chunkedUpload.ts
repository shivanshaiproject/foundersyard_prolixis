/**
 * Chunked upload with resumability support
 * Handles large file uploads with connection interruption recovery
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export interface ChunkProgress {
  loaded: number;
  total: number;
  percentage: number;
  chunksUploaded: number;
  totalChunks: number;
  status: 'uploading' | 'paused' | 'complete' | 'error' | 'retrying';
}

export interface UploadState {
  fileKey: string;
  uploadedChunks: number[];
  totalChunks: number;
}

// Store upload state in localStorage for resumability
function getUploadState(fileKey: string): UploadState | null {
  try {
    const state = localStorage.getItem(`upload_state_${fileKey}`);
    return state ? JSON.parse(state) : null;
  } catch {
    return null;
  }
}

function saveUploadState(state: UploadState): void {
  try {
    localStorage.setItem(`upload_state_${state.fileKey}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function clearUploadState(fileKey: string): void {
  try {
    localStorage.removeItem(`upload_state_${fileKey}`);
  } catch {
    // Ignore storage errors
  }
}

async function uploadChunk(
  url: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  contentType: string
): Promise<boolean> {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${chunkIndex * CHUNK_SIZE}-${Math.min((chunkIndex + 1) * CHUNK_SIZE - 1, chunk.size)}/`,
        },
        body: chunk,
      });
      
      if (response.ok || response.status === 200 || response.status === 204) {
        return true;
      }
      
      throw new Error(`Upload failed with status ${response.status}`);
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
    }
  }
  
  return false;
}

export async function chunkedUpload(
  file: Blob,
  uploadUrl: string,
  fileKey: string,
  contentType: string,
  onProgress?: (progress: ChunkProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Check for existing upload state
  let state = getUploadState(fileKey);
  if (!state || state.totalChunks !== totalChunks) {
    state = {
      fileKey,
      uploadedChunks: [],
      totalChunks
    };
  }
  
  // For small files, just do a single upload
  if (file.size <= CHUNK_SIZE) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => xhr.abort());
      }
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress?.({
            loaded: e.loaded,
            total: e.total,
            percentage: (e.loaded / e.total) * 100,
            chunksUploaded: 0,
            totalChunks: 1,
            status: 'uploading'
          });
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          clearUploadState(fileKey);
          onProgress?.({
            loaded: file.size,
            total: file.size,
            percentage: 100,
            chunksUploaded: 1,
            totalChunks: 1,
            status: 'complete'
          });
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  }

  // For larger files, upload in chunks
  for (let i = 0; i < totalChunks; i++) {
    if (abortSignal?.aborted) {
      saveUploadState(state);
      throw new Error('Upload aborted');
    }
    
    // Skip already uploaded chunks
    if (state.uploadedChunks.includes(i)) {
      continue;
    }
    
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    onProgress?.({
      loaded: state.uploadedChunks.length * CHUNK_SIZE,
      total: file.size,
      percentage: (state.uploadedChunks.length / totalChunks) * 100,
      chunksUploaded: state.uploadedChunks.length,
      totalChunks,
      status: 'uploading'
    });
    
    try {
      await uploadChunk(uploadUrl, chunk, i, totalChunks, contentType);
      state.uploadedChunks.push(i);
      saveUploadState(state);
    } catch (error) {
      onProgress?.({
        loaded: state.uploadedChunks.length * CHUNK_SIZE,
        total: file.size,
        percentage: (state.uploadedChunks.length / totalChunks) * 100,
        chunksUploaded: state.uploadedChunks.length,
        totalChunks,
        status: 'retrying'
      });
      
      saveUploadState(state);
      throw error;
    }
  }
  
  // All chunks uploaded successfully
  clearUploadState(fileKey);
  
  onProgress?.({
    loaded: file.size,
    total: file.size,
    percentage: 100,
    chunksUploaded: totalChunks,
    totalChunks,
    status: 'complete'
  });
}

export function getResumableUploadInfo(fileKey: string): { canResume: boolean; progress: number } {
  const state = getUploadState(fileKey);
  if (!state) {
    return { canResume: false, progress: 0 };
  }
  return {
    canResume: true,
    progress: (state.uploadedChunks.length / state.totalChunks) * 100
  };
}
