import { getAudioEngine } from '$lib/audio/engine';
import { getFileUrlForTrack } from '$lib/scanner';
import { playerState } from '$lib/stores/player';
import { playNext } from '$lib/stores/queue';
import { get } from 'svelte/store';

let engineInitialized = false;

/** Wire up the audio engine's callbacks to the Svelte player store. */
function ensureEngineCallbacks(): void {
  if (engineInitialized) return;
  engineInitialized = true;

  const engine = getAudioEngine();

  engine.onTimeUpdate = (currentTime, duration) => {
    playerState.update((s) => ({
      ...s,
      position: currentTime,
      duration: duration || s.duration,
    }));
  };

  engine.onEnded = () => {
    const ps = get(playerState);
    if (ps.repeatMode === 'one') {
      // Replay the same track
      const track = ps.currentTrack;
      if (track) {
        void playFile(track.file_path);
      }
    } else {
      void playNext();
    }
  };

  engine.onError = (error) => {
    console.error('[audio] Playback error:', error);
  };
}

/* ── Position poller ─────────────────────────────────────────────
 * Reads the actual audio position directly from the engine every 200ms.
 * This is the PRIMARY position source — more reliable than relying
 * solely on browser `timeupdate` events which can be delayed or
 * fire inconsistently (background tabs, slow decodes, etc.).
 */
let positionPoller: number | null = null;

function startPositionPoller(): void {
  if (positionPoller !== null) return;
  positionPoller = window.setInterval(() => {
    const realTime = getAudioEngine().getCurrentTime();
    // Guard against NaN (edge case on audio element reset)
    if (!Number.isFinite(realTime)) return;
    // Only overwrite position when actively playing — seekToSeconds etc.
    // set their own position when stalled.
    playerState.update((s) => {
      if (!s.isPlaying || s.isPaused || s.isStopped) return s;
      return { ...s, position: realTime };
    });
  }, 200);
}

function stopPositionPoller(): void {
  if (positionPoller === null) return;
  window.clearInterval(positionPoller);
  positionPoller = null;
}

// Start/stop poller in sync with playback state
playerState.subscribe((s) => {
  const shouldRun = !!s.currentTrack && s.isPlaying && !s.isPaused && !s.isStopped;
  if (shouldRun) startPositionPoller();
  else stopPositionPoller();
});

export async function playFile(path: string): Promise<void> {
  ensureEngineCallbacks();
  const engine = getAudioEngine();
  const url = await getFileUrlForTrack(path);
  engine.playFile(url);
}

export async function playFileAt(path: string, position: number): Promise<void> {
  ensureEngineCallbacks();
  const engine = getAudioEngine();
  const url = await getFileUrlForTrack(path);
  engine.playFileAt(url, position);
}

export async function pauseAudio(): Promise<void> {
  getAudioEngine().pause();
}

export async function resumeAudio(): Promise<void> {
  getAudioEngine().resume();
}

export async function stopAudio(): Promise<void> {
  getAudioEngine().stop();
}

export async function setVolume(volume: number): Promise<void> {
  getAudioEngine().setVolume(volume);
}
