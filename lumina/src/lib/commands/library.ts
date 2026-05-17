import { invoke } from '@tauri-apps/api/core';
import type { Track, Playlist } from '../types';

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

export async function updateTrackMetadata(
  trackId: string,
  fields: {
    title?: string;
    artist?: string;
    album?: string;
    album_artist?: string;
    genre?: string;
    year?: string;
    track_number?: string;
    disc_number?: string;
    composer?: string;
    publisher?: string;
    comments?: string;
    artwork_path?: string;
  },
): Promise<void> {
  return invoke('edit_track_metadata', {
    track_id: trackId,
    title: fields.title ?? null,
    artist: fields.artist ?? null,
    album: fields.album ?? null,
    album_artist: fields.album_artist ?? null,
    genre: fields.genre ?? null,
    year: fields.year ?? null,
    track_number: fields.track_number ?? null,
    disc_number: fields.disc_number ?? null,
    composer: fields.composer ?? null,
    publisher: fields.publisher ?? null,
    comments: fields.comments ?? null,
    artwork_path: fields.artwork_path ?? null,
  });
}

export async function getFavoriteTracks(): Promise<Track[]> {
  return invoke('get_favorite_tracks');
}

export async function getRecentTracks(limit?: number): Promise<Track[]> {
  return invoke('get_recent_tracks', { limit });
}

export async function searchTracks(query: string): Promise<Track[]> {
  return invoke('search_tracks', { query });
}

// ── Playlists ──

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  return invoke('create_playlist', { name, description });
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  return invoke('get_all_playlists');
}

export async function getPlaylist(playlistId: string): Promise<Playlist | null> {
  return invoke('get_playlist', { playlist_id: playlistId });
}

export async function renamePlaylist(playlistId: string, name: string): Promise<void> {
  return invoke('rename_playlist', { playlist_id: playlistId, name });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  return invoke('delete_playlist', { playlist_id: playlistId });
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  return invoke('get_playlist_tracks', { playlist_id: playlistId });
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  return invoke('add_track_to_playlist', { playlist_id: playlistId, track_id: trackId });
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  return invoke('remove_track_from_playlist', { playlist_id: playlistId, track_id: trackId });
}

// ── Folder Watch ──

export async function watchDirectory(path: string): Promise<void> {
  return invoke('watch_directory', { path });
}

export async function unwatchDirectory(path: string): Promise<void> {
  return invoke('unwatch_directory', { path });
}
