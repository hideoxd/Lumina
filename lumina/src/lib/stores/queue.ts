import { writable, get } from 'svelte/store';
import type { QueueState, Track } from '$lib/types';
import { playFile, playFileAt, pauseAudio, resumeAudio, stopAudio, setVolume } from '$lib/commands/audio';
import { markTrackPlayed } from '$lib/commands/library';
import { playerState } from '$lib/stores/player';
import { patchTrack } from '$lib/stores/library';

export const queueState = writable<QueueState>({
  tracks: [],
  currentIndex: -1,
  history: [],
  originalOrder: null,
});

function fisherYatesShuffle(arr: Track[]): Track[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function setQueue(list: Track[], startIndex: number) {
  queueState.set({
    tracks: list,
    currentIndex: Math.max(0, Math.min(startIndex, list.length - 1)),
    history: [],
    originalOrder: null,
  });
  // Re-apply shuffle if player has shuffle enabled
  const ps = get(playerState);
  if (ps.isShuffled && list.length > 0) {
    applyShuffle(list, Math.max(0, Math.min(startIndex, list.length - 1)));
  }
}

export function toggleShuffle() {
  const ps = get(playerState);
  const qs = get(queueState);

  if (ps.isShuffled) {
    if (qs.originalOrder && qs.tracks.length > 0 && qs.currentIndex >= 0) {
      const currentTrack = qs.tracks[qs.currentIndex];
      const restoredIndex = qs.originalOrder.findIndex(t => t.id === currentTrack.id);
      queueState.set({
        ...qs,
        tracks: qs.originalOrder,
        currentIndex: restoredIndex >= 0 ? restoredIndex : 0,
        originalOrder: null,
      });
    } else {
      queueState.set({
        ...qs,
        tracks: qs.originalOrder ?? qs.tracks,
        originalOrder: null,
      });
    }
    playerState.update(s => ({ ...s, isShuffled: false }));
  } else {
    if (qs.tracks.length > 0) {
      applyShuffle(qs.tracks, qs.currentIndex);
    }
    playerState.update(s => ({ ...s, isShuffled: true }));
  }
}

function applyShuffle(tracks: Track[], keepIndex: number) {
  const original = [...tracks];
  const shuffled = [...tracks];
  const [current] = shuffled.splice(keepIndex, 1);
  fisherYatesShuffle(shuffled);
  shuffled.unshift(current);

  queueState.update(qs => ({
    ...qs,
    tracks: shuffled,
    currentIndex: 0,
    originalOrder: original,
  }));
}

export function getCurrentQueueTrack(): Track | null {
  const qs = get(queueState);
  if (qs.currentIndex < 0 || qs.currentIndex >= qs.tracks.length) return null;
  return qs.tracks[qs.currentIndex] ?? null;
}

export function addToQueueNext(track: Track) {
  queueState.update(qs => {
    const newTracks = [...qs.tracks];
    // insert right after current index
    const insertIdx = qs.currentIndex >= 0 ? qs.currentIndex + 1 : 0;
    newTracks.splice(insertIdx, 0, track);
    return {
      ...qs,
      tracks: newTracks
    };
  });
}

export async function playQueueIndex(index: number): Promise<void> {
  const qs = get(queueState);
  const track = qs.tracks[index];
  if (!track) return;

  await playFile(track.file_path);

  // Persist play history (best-effort) and update UI immediately.
  const now = new Date().toISOString();
  patchTrack(track.id, { last_played: now, play_count: (track.play_count ?? 0) + 1 });
  void markTrackPlayed(track.id).catch(() => {});

  queueState.set({
    ...qs,
    currentIndex: index,
    history: qs.currentIndex >= 0 ? [...qs.history, qs.tracks[qs.currentIndex]].filter(Boolean) : qs.history,
  });

  playerState.update((s) => ({
    ...s,
    currentTrack: track,
    isPlaying: true,
    isPaused: false,
    isStopped: false,
    duration: track.duration,
    position: 0,
  }));
}

export async function playNext(): Promise<void> {
  const qs = get(queueState);
  if (qs.tracks.length === 0) return;
  const ps = get(playerState);
  const isLast = qs.currentIndex >= qs.tracks.length - 1;

  let next: number;
  if (ps.repeatMode === 'all' && isLast) {
    next = 0; // wrap around
  } else if (ps.repeatMode === 'off' && isLast) {
    return; // stop at end
  } else {
    next = qs.currentIndex + 1;
  }
  await playQueueIndex(next);
}

export async function playPrevious(): Promise<void> {
  const qs = get(queueState);
  if (qs.tracks.length === 0) return;
  const ps = get(playerState);
  const isFirst = qs.currentIndex <= 0;

  let prev: number;
  if (ps.repeatMode === 'all' && isFirst) {
    prev = qs.tracks.length - 1; // wrap to last
  } else if (isFirst) {
    return; // stay at start (repeat off or repeat one)
  } else {
    prev = qs.currentIndex - 1;
  }
  await playQueueIndex(prev);
}

export async function togglePlayPause(): Promise<void> {
  const ps = get(playerState);
  const current = ps.currentTrack ?? getCurrentQueueTrack();

  if (!current) return;

  if (ps.isPlaying && !ps.isPaused) {
    await pauseAudio();
    playerState.update((s) => ({ ...s, isPaused: true, isPlaying: false }));
  } else {
    // If we have a current track but stopped, re-play file to ensure audio resumes.
    if (ps.isStopped) {
      if (!current.file_path.startsWith('youtube:')) {
        const { ensureFolderPermissionAtClick } = await import('$lib/controllers/library');
        const ok = await ensureFolderPermissionAtClick();
        if (!ok) return;
      }
      await playFile(current.file_path);
    } else {
      await resumeAudio();
    }
    playerState.update((s) => ({ ...s, isPaused: false, isPlaying: true, isStopped: false }));
  }
}

export async function stopPlayback(): Promise<void> {
  await stopAudio();
  playerState.update((s) => ({
    ...s,
    isPlaying: false,
    isPaused: false,
    isStopped: true,
    position: 0,
  }));
}

/** Seek to an absolute position (in seconds) for the current track. */
export async function seekToSeconds(positionSeconds: number): Promise<void> {
  const ps = get(playerState);
  const track = ps.currentTrack ?? getCurrentQueueTrack();
  if (!track) return;

  const position = Math.max(0, Math.min(track.duration || 0, positionSeconds));
  const wasPaused = ps.isPaused && !ps.isStopped;

  await playFileAt(track.file_path, position);
  if (wasPaused) await pauseAudio();

  playerState.update((s) => ({
    ...s,
    currentTrack: track,
    duration: track.duration,
    position,
    isStopped: false,
    isPaused: wasPaused,
    isPlaying: !wasPaused,
  }));
}

export async function setPlayerVolume01(volume01: number): Promise<void> {
  const vol = Math.max(0, Math.min(1, volume01));
  await setVolume(vol);
  playerState.update((s) => ({ ...s, volume: vol, isMuted: vol === 0 }));
}
