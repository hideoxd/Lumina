/**
 * In browser mode, artwork_path stores either:
 * 1. A base64 data URL (e.g., "data:image/jpeg;base64,...")
 * 2. A blob URL (e.g., "blob:...")
 * 3. A plain filename (legacy, from Tauri mode)
 * 
 * This function normalizes them all to a usable URL for <img src>.
 */
export async function getArtworkUrl(artworkPath: string): Promise<string> {
  if (!artworkPath) return '';
  
  // Already a data URL, blob URL, or web URL — use as-is
  if (artworkPath.startsWith('data:') || artworkPath.startsWith('blob:') || artworkPath.startsWith('http:') || artworkPath.startsWith('https:')) {
    return artworkPath;
  }
  
  // For legacy Tauri-stored filenames, return empty (can't resolve without Tauri)
  return '';
}
