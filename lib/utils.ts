/**
 * Get the correct asset path for both local development and deployment
 * Handles basePath for GitHub Pages deployment
 */
export function getAssetPath(path: string): string {
  // If path is external, return as-is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Get basePath from Next.js config (should be empty for root domain deployment)
  const basePath = '';
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Return the normalized path (no basePath needed for root domain)
  return normalizedPath;
}