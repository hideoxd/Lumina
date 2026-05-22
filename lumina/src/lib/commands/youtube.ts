export async function downloadYoutubeVideo(url: string): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('download_youtube', { url });
  } catch {
    throw new Error(
      'YouTube download requires the Tauri desktop app with yt-dlp installed. ' +
      'Make sure you are running the desktop version and not the browser mode.'
    );
  }
}
