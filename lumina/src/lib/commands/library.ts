import { invoke } from '@tauri-apps/api/core';
import type { Track } from '../types';

export async function scanDirectory(path: string): Promise<void> {
  return invoke('scan_directory', { path });
}

export async function getAllTracks(): Promise<Track[]> {
  return invoke('get_all_tracks');
}

export async function setTrackFavorite(trackId: string, favorite: boolean): Promise<void> {
  return invoke('set_track_favorite', { track_id: trackId, favorite });
}

export async function markTrackPlayed(trackId: string): Promise<void> {
  return invoke('mark_track_played', { track_id: trackId });
}

export async function getFavoriteTracks(): Promise<Track[]> {
  return invoke('get_favorite_tracks');
}

export async function getRecentTracks(limit?: number): Promise<Track[]> {
  return invoke('get_recent_tracks', { limit });
}
