import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';

let cachedAppDataDir: string | null = null;

async function getAppDataDirCached(): Promise<string> {
  if (cachedAppDataDir) return cachedAppDataDir;
  cachedAppDataDir = await appDataDir();
  return cachedAppDataDir;
}

/**
 * Converts an artwork filename stored by the Rust backend into a safe URL usable in <img src>.
 * The backend currently stores only the filename under {appDataDir}/artworks/.
 */
export async function getArtworkUrl(filename: string): Promise<string> {
  const dir = await getAppDataDirCached();
  const fullPath = await join(dir, 'artworks', filename);
  return convertFileSrc(fullPath);
}
