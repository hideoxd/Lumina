import { get } from 'svelte/store';
import { getAllTracks } from '$lib/commands/library';
import { libraryLoading, scanProgress, tracks, folderPermissionState } from '$lib/stores/library';
import { pickMusicFolder, scanDirectoryHandle, getStoredDirectoryHandle, setLastDirectoryHandle, lastDirectoryHandle } from '$lib/scanner';
import * as db from '$lib/db/queries';
import type { Track } from '$lib/types';

export async function initLibraryListeners(): Promise<void> {
  // No Tauri event listeners needed in browser mode.
  // Scan progress is handled via callbacks directly.
}

export async function refreshTracks(): Promise<Track[]> {
  try {
    const all = await getAllTracks();
    tracks.set(all);
    return all;
  } catch (e) {
    console.error('[lumina] Failed to refresh tracks:', e);
    // Return empty list so the UI still renders the dashboard
    tracks.set([]);
    return [];
  }
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

/** Check if there is a saved directory handle and verify if it still has read access */
export async function checkFolderPermission(): Promise<void> {
  try {
    const dirHandle = await getStoredDirectoryHandle();
    if (dirHandle) {
      // ALWAYS set the in-memory lastDirectoryHandle on boot so it is ready for click permission gestures!
      setLastDirectoryHandle(dirHandle);
      const permission = await (dirHandle as any).queryPermission({ mode: 'read' });
      if (permission === 'granted') {
        folderPermissionState.set('granted');
      } else {
        folderPermissionState.set('stored_needs_permission');
      }
    } else {
      folderPermissionState.set('none');
    }
  } catch (err) {
    console.error('[lumina] Failed to check folder permission:', err);
    folderPermissionState.set('none');
  }
}

/** Explicitly prompt the browser to request permission for the stored folder handle */
export async function requestFolderPermission(): Promise<boolean> {
  try {
    const dirHandle = lastDirectoryHandle ?? (await getStoredDirectoryHandle());
    if (!dirHandle) return false;

    const permission = await (dirHandle as any).requestPermission({ mode: 'read' });
    if (permission === 'granted') {
      setLastDirectoryHandle(dirHandle);
      folderPermissionState.set('granted');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[lumina] Permission prompt failed:', err);
    return false;
  }
}

/**
 * Prompts the user for folder permission immediately using the cached directory handle.
 * This should be called directly inside a click handler to preserve the browser user gesture.
 */
export async function ensureFolderPermissionAtClick(): Promise<boolean> {
  const state = get(folderPermissionState);
  if (state === 'granted') return true;

  try {
    // Grab the synchronously cached lastDirectoryHandle to guarantee no async boundary ticks are incurred.
    const dirHandle = lastDirectoryHandle ?? (await getStoredDirectoryHandle());
    if (dirHandle) {
      const permission = await (dirHandle as any).requestPermission({ mode: 'read' });
      if (permission === 'granted') {
        setLastDirectoryHandle(dirHandle);
        folderPermissionState.set('granted');
        return true;
      }
    }
  } catch (err) {
    console.error('[lumina] Click-time folder permission request failed:', err);
  }
  return false;
}
