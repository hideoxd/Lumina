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

/* ============================================================
   Lightweight position ticker
   ============================================================
   Rodio doesn't expose a robust cross-platform playback position API.
   Until we wire a native position callback/event from Rust, we keep the UI
   progress buttery-smooth with a simple timer based on wall-clock time.
*/

let ticker: number | null = null;
let lastTick = 0;

function startTicker() {
  if (ticker !== null) return;
  lastTick = performance.now();
  ticker = window.setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    playerState.update((s) => {
      if (!s.currentTrack) return s;
      if (!s.isPlaying || s.isPaused || s.isStopped) return s;
      if (!Number.isFinite(s.duration) || s.duration <= 0) return s;

      const nextPos = Math.min(s.position + dt, s.duration);
      const ended = nextPos >= s.duration;

      return {
        ...s,
        position: nextPos,
        isPlaying: ended ? false : s.isPlaying,
        isStopped: ended ? true : s.isStopped,
      };
    });
  }, 250);
}

function stopTicker() {
  if (ticker === null) return;
  window.clearInterval(ticker);
  ticker = null;
}

playerState.subscribe((s) => {
  const shouldRun = !!s.currentTrack && s.isPlaying && !s.isPaused && !s.isStopped;
  if (shouldRun) startTicker();
  else stopTicker();
});

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
