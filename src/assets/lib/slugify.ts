/**
 * Generate a clean, SEO-friendly slug from text
 * No random hashes - just clean readable URLs
 */
export function generateSlug(text: string, counter?: number): string {
  const base = text
    .toLowerCase()
    .replace(/[₹$€£¥]/g, '') // Remove currency symbols
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .trim()
    .substring(0, 60)
    .replace(/-+$/, '') // Remove trailing hyphens
    .replace(/^-+/, ''); // Remove leading hyphens

  const cleanBase = base || 'post';
  
  if (counter && counter > 1) {
    return `${cleanBase}-${counter}`;
  }

  return cleanBase;
}

/**
 * Extract a readable title from post content (first line or first 60 chars)
 */
export function extractTitle(content: string): string {
  // Get first line or first 60 characters
  const firstLine = content.split('\n')[0].trim();
  return firstLine.substring(0, 60);
}
