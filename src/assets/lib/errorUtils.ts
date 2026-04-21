/**
 * Sanitizes error messages to hide technical database details from users.
 * Keeps console.error for debugging but returns user-friendly messages.
 */
export function sanitizeError(error: unknown): string {
  const message = (error as { message?: string })?.message || '';
  
  // Duplicate key / already exists
  if (message.includes('duplicate key') || message.includes('unique constraint') || message.includes('already exists')) {
    return 'This action has already been performed.';
  }
  
  // Foreign key / not found
  if (message.includes('foreign key') || message.includes('violates foreign key')) {
    return 'Related data could not be found.';
  }
  
  // Permission / RLS errors
  if (message.includes('permission denied') || message.includes('row-level security') || message.includes('RLS')) {
    return 'You do not have permission to perform this action.';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }
  
  // Generic fallback - never expose raw error
  return 'Something went wrong. Please try again.';
}
