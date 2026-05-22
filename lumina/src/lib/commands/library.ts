import type { Track, Playlist } from '$lib/types';
import * as db from '$lib/db/queries';

export async function scanDirectory(_path: string): Promise<void> {
  // In browser mode, scanning is handled by the scanner module directly.
}

export async function getAllTracks(): Promise<Track[]> {
  return db.getAllTracks();
}

export async function setTrackFavorite(trackId: string, favorite: boolean): Promise<void> {
  return db.setTrackFavorite(trackId, favorite);
}

export async function markTrackPlayed(trackId: string): Promise<void> {
  return db.markTrackPlayed(trackId);
}

export async function deleteTrack(trackId: string): Promise<void> {
  return db.deleteTrack(trackId);
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
  function parseNum(val: string): number | null {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : null;
  }

  const dbFields: Record<string, unknown> = {};
  if (fields.title !== undefined) dbFields.title = fields.title;
  if (fields.artist !== undefined) dbFields.artist = fields.artist;
  if (fields.album !== undefined) dbFields.album = fields.album;
  if (fields.album_artist !== undefined) dbFields.album_artist = fields.album_artist;
  if (fields.genre !== undefined) dbFields.genre = fields.genre;
  if (fields.year !== undefined) dbFields.year = fields.year === '' ? null : parseNum(fields.year);
  if (fields.track_number !== undefined) dbFields.track_number = fields.track_number === '' ? null : parseNum(fields.track_number);
  if (fields.disc_number !== undefined) dbFields.disc_number = fields.disc_number === '' ? null : parseNum(fields.disc_number);
  if (fields.composer !== undefined) dbFields.composer = fields.composer;
  if (fields.publisher !== undefined) dbFields.publisher = fields.publisher;
  if (fields.comments !== undefined) dbFields.comments = fields.comments;
  if (fields.artwork_path !== undefined) dbFields.artwork_path = fields.artwork_path;

  return db.updateTrackMetadata(trackId, dbFields);
}

export async function getFavoriteTracks(): Promise<Track[]> {
  return db.getFavoriteTracks();
}

export async function getRecentTracks(limit?: number): Promise<Track[]> {
  return db.getRecentTracks(limit ?? 50);
}

export async function searchTracks(query: string): Promise<Track[]> {
  return db.searchTracks(query);
}

// ── Playlists ──

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const playlist: Playlist = {
    id,
    name,
    description: description ?? '',
    artwork_path: null,
    track_count: 0,
    total_duration: 0,
    created_at: now,
    updated_at: now,
    is_smart: false,
    smart_rules: null,
  };
  await db.createPlaylist(playlist);
  return playlist;
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  return db.getAllPlaylists();
}

export async function getPlaylist(playlistId: string): Promise<Playlist | null> {
  return db.getPlaylist(playlistId);
}

export async function renamePlaylist(playlistId: string, name: string): Promise<void> {
  const existing = await db.getPlaylist(playlistId);
  if (!existing) throw new Error('Playlist not found');
  existing.name = name;
  existing.updated_at = new Date().toISOString();
  await db.updatePlaylist(existing);
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  return db.deletePlaylist(playlistId);
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  return db.getPlaylistTracks(playlistId);
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  return db.addTrackToPlaylist(playlistId, trackId);
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  return db.removeTrackFromPlaylist(playlistId, trackId);
}

// ── Folder Watch (no-op in browser) ──

export async function watchDirectory(_path: string): Promise<void> {}
export async function unwatchDirectory(_path: string): Promise<void> {}
