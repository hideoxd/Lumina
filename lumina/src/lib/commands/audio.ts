import { invoke } from '@tauri-apps/api/core';

export async function playFile(path: string): Promise<void> {
  return invoke('play_file', { path });
}

export async function playFileAt(path: string, position: number): Promise<void> {
  return invoke('play_file_at', { path, position });
}

export async function pauseAudio(): Promise<void> {
  return invoke('pause_audio');
}

export async function resumeAudio(): Promise<void> {
  return invoke('resume_audio');
}

export async function stopAudio(): Promise<void> {
  return invoke('stop_audio');
}

export async function setVolume(volume: number): Promise<void> {
  return invoke('set_volume', { volume });
}
