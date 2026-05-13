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
});

export function setQueue(list: Track[], startIndex: number) {
  queueState.set({
    tracks: list,
    currentIndex: Math.max(0, Math.min(startIndex, list.length - 1)),
    history: [],
  });
}

export function getCurrentQueueTrack(): Track | null {
  const qs = get(queueState);
  if (qs.currentIndex < 0 || qs.currentIndex >= qs.tracks.length) return null;
  return qs.tracks[qs.currentIndex] ?? null;
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
    tracks: qs.tracks,
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
  const next = Math.min(qs.currentIndex + 1, qs.tracks.length - 1);
  await playQueueIndex(next);
}

export async function playPrevious(): Promise<void> {
  const qs = get(queueState);
  if (qs.tracks.length === 0) return;
  const prev = Math.max(qs.currentIndex - 1, 0);
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
