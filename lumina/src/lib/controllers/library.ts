import { getAllTracks } from '$lib/commands/library';
import { libraryLoading, scanProgress, tracks } from '$lib/stores/library';
import { pickMusicFolder, scanDirectoryHandle } from '$lib/scanner';
import * as db from '$lib/db/queries';
import type { Track } from '$lib/types';

export async function initLibraryListeners(): Promise<void> {
  // No Tauri event listeners needed in browser mode.
  // Scan progress is handled via callbacks directly.
}

export async function refreshTracks(): Promise<Track[]> {
  const all = await getAllTracks();
  tracks.set(all);
  return all;
}

export async function addMusicFolderWithDialog(): Promise<string | null> {
  // Use the File System Access API to pick a folder
  const dirHandle = await pickMusicFolder();
  if (!dirHandle) return null;

  libraryLoading.set(true);
  scanProgress.set({ total: 0, scanned: 0, phase: 'scanning' });

  try {
    const scannedTracks = await scanDirectoryHandle(dirHandle, (scanned, total) => {
      scanProgress.set({
        total,
        scanned,
        phase: scanned < total ? 'reading_metadata' : 'saving',
      });
    });

    // Save all scanned tracks to the database
    scanProgress.set({ total: scannedTracks.length, scanned: scannedTracks.length, phase: 'saving' });

    for (const scanned of scannedTracks) {
      const track: Track = {
        id: scanned.id,
        title: scanned.title,
        artist: scanned.artist,
        album: scanned.album,
        album_artist: scanned.album_artist,
        genre: scanned.genre,
        year: scanned.year,
        track_number: scanned.track_number,
        disc_number: scanned.disc_number,
        duration: scanned.duration,
        file_path: scanned.file_path,
        file_format: scanned.file_format,
        file_size: scanned.file_size,
        bitrate: scanned.bitrate,
        sample_rate: scanned.sample_rate,
        composer: scanned.composer,
        publisher: scanned.publisher,
        comments: scanned.comments,
        artwork_path: scanned.artwork_data, // store base64 artwork data as artwork_path
        date_added: scanned.date_added,
        last_played: scanned.last_played,
        play_count: scanned.play_count,
        favorite: scanned.favorite,
      };
      await db.insertTrack(track);
    }

    scanProgress.set({ total: scannedTracks.length, scanned: scannedTracks.length, phase: 'complete' });
    libraryLoading.set(false);

    // Refresh track list from DB
    await refreshTracks();

    return dirHandle.name;
  } catch (e) {
    console.error('Scan failed:', e);
    libraryLoading.set(false);
    scanProgress.set(null);
    throw new Error('Scan failed');
  }
}

export function disposeLibraryListeners(): void {
  // No-op in browser mode
}
