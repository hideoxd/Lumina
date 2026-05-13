import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

import { getAllTracks, scanDirectory } from '$lib/commands/library';
import { libraryLoading, scanProgress, tracks } from '$lib/stores/library';

import type { ScanProgress, Track } from '$lib/types';

let unlistenScanProgress: null | (() => void) = null;

export async function initLibraryListeners(): Promise<void> {
  if (unlistenScanProgress) return;

  unlistenScanProgress = await listen<ScanProgress>('scan-progress', (event) => {
    const payload = event.payload;

    scanProgress.set({
      total: payload.total,
      scanned: payload.scanned,
      phase: payload.phase,
    });

    if (payload.phase === 'complete') {
      libraryLoading.set(false);
      void refreshTracks();
    }
  });
}

export async function refreshTracks(): Promise<Track[]> {
  const all = await getAllTracks();
  tracks.set(all);
  return all;
}

export async function addMusicFolderWithDialog(): Promise<string | null> {
  await initLibraryListeners();

  const selection = await open({
    directory: true,
    multiple: false,
    title: 'Add Music Folder',
  });

  if (!selection || Array.isArray(selection)) return null;

  libraryLoading.set(true);
  scanProgress.set({ total: 0, scanned: 0, phase: 'scanning' });

  try {
    await scanDirectory(selection);
  } catch {
    libraryLoading.set(false);
    scanProgress.set(null);
    throw new Error('Scan failed');
  }

  // scanDirectory returns when the backend finishes (it awaits spawn_blocking),
  // but we still keep the event-driven completion as the source of truth.
  return selection;
}

export function disposeLibraryListeners(): void {
  unlistenScanProgress?.();
  unlistenScanProgress = null;
}
