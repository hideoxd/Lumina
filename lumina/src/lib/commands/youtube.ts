import { invoke } from '@tauri-apps/api/core';

export async function downloadYoutubeVideo(url: string): Promise<string> {
  return invoke('download_youtube', { url });
}
