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
