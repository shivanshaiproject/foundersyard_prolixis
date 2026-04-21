/**
 * Converts R2 S3 endpoint URLs to public R2 dev URLs for browser playback.
 * Uploads use the S3 endpoint; playback MUST use the public URL.
 */
const R2_PUBLIC_URL = 'https://pub-e7f20568d5634892948e420436b257fa.r2.dev';

export function normalizeR2Url(url: string | null | undefined): string {
  if (!url) return '';
  
  // Already using public R2 URL - return as-is
  if (url.startsWith(R2_PUBLIC_URL)) {
    return url;
  }
  
  // Convert S3 endpoint URL to public URL
  // Pattern: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
  const s3Match = url.match(/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/);
  if (s3Match) {
    const key = s3Match[1];
    return `${R2_PUBLIC_URL}/${key}`;
  }
  
  // Not an R2 URL, return as-is
  return url;
}
