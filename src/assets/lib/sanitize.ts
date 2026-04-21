/**
 * Security utilities for sanitizing user input
 * Prevents XSS attacks by escaping HTML entities
 */

/**
 * Escapes HTML entities to prevent XSS when displaying text
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Strips all HTML tags from text (for storage)
 * Note: Database triggers also strip HTML, this is defense-in-depth
 */
export const stripHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '');
};

/**
 * Validates and sanitizes username input
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizes content for posts/comments - strips HTML
 */
export const sanitizeContent = (content: string | null | undefined): string => {
  if (!content) return '';
  // Strip HTML tags
  const stripped = content.replace(/<[^>]*>/g, '');
  // Trim and limit length
  return stripped.trim();
};
