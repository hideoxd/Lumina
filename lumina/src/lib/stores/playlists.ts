import { writable, derived } from 'svelte/store';
import type { Playlist, Track } from '$lib/types';
import { getAllPlaylists, getPlaylistTracks } from '$lib/commands/library';

export const playlists = writable<Playlist[]>([]);
export const selectedPlaylist = writable<Playlist | null>(null);
export const playlistTracks = writable<Track[]>([]);
export const playlistsLoading = writable(false);

export async function refreshPlaylists() {
  try {
    const list = await getAllPlaylists();
    playlists.set(list);
  } catch (e) {
    console.error('Failed to load playlists', e);
  }
}

export async function loadPlaylistTracks(playlistId: string) {
  try {
    const tracks = await getPlaylistTracks(playlistId);
    playlistTracks.set(tracks);
  } catch (e) {
    console.error('Failed to load playlist tracks', e);
    playlistTracks.set([]);
  }
}

export function selectPlaylist(playlist: Playlist | null) {
  selectedPlaylist.set(playlist);
  if (playlist) {
    void loadPlaylistTracks(playlist.id);
  } else {
    playlistTracks.set([]);
  }
}
