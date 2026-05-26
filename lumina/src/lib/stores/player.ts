/* ============================================================
   Lumina — Player Store
   Manages playback state, current track, progress, volume
   ============================================================ */
import { writable, derived } from 'svelte/store';
import type { Track, RepeatMode, PlayerState } from '$lib/types';

/** Full player state */
export const playerState = writable<PlayerState>({
  currentTrack: null,
  isPlaying: false,
  isPaused: false,
  isStopped: true,
  position: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
  crossfadeEnabled: false,
  crossfadeDuration: 3,
});

/** Current track (derived for convenience) */
export const currentTrack = derived(playerState, ($ps) => $ps.currentTrack);

/** Is currently playing */
export const isPlaying = derived(playerState, ($ps) => $ps.isPlaying);

/** Playback progress as 0-1 fraction */
export const progress = derived(playerState, ($ps) =>
  $ps.duration > 0 ? $ps.position / $ps.duration : 0
);

/** Volume level 0-1 */
export const volume = derived(playerState, ($ps) => $ps.isMuted ? 0 : $ps.volume);

/* Position is polled from the audio engine's getCurrentTime() every 200ms
   (see commands/audio.ts — positionPoller). A real-time fallback via the
   engine's onTimeUpdate callback also updates position. */

/** Format time in mm:ss */
export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format duration in human-readable format */
export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function setVolume(v: number) {
  playerState.update(s => ({ ...s, volume: v }));
}

export function toggleRepeat() {
  playerState.update(s => {
    const next = s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off';
    return { ...s, repeatMode: next };
  });
}
