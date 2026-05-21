export async function downloadYoutubeVideo(_url: string): Promise<string> {
  throw new Error(
    'YouTube download is not available in browser mode. ' +
    'It requires the yt-dlp system binary which cannot run in a web browser.'
  );
}
