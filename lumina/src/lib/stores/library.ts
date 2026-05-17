/* ============================================================
   Lumina — Library Store
   Manages tracks, albums, artists, search/filter/sort
   ============================================================ */
import { writable, derived } from 'svelte/store';
import type { Track, Album, Artist, SortField, SortDirection } from '$lib/types';
import { searchQuery } from '$lib/stores/ui';

/** All tracks in library */
export const tracks = writable<Track[]>([]);

/** Patch a track in-place by id (used for favorites / play history updates). */
export function patchTrack(trackId: string, patch: Partial<Track>) {
  tracks.update((list) => list.map((t) => (t.id === trackId ? ({ ...t, ...patch } as Track) : t)));
}

/** All albums (derived from tracks) */
export const albums = derived(tracks, ($tracks) => {
  const albumMap = new Map<string, Album>();
  for (const track of $tracks) {
    const key = `${track.album}::${track.album_artist ?? track.artist}`;
    if (!albumMap.has(key)) {
      albumMap.set(key, {
        id: key,
        title: track.album || 'Unknown Album',
        artist: track.album_artist ?? track.artist ?? 'Unknown Artist',
        year: track.year,
        artwork_path: track.artwork_path,
        track_count: 0,
        total_duration: 0,
          genre: track.genre ?? '',
      });
    }
    const album = albumMap.get(key)!;
    album.track_count += 1;
    album.total_duration += track.duration;
  }
  return Array.from(albumMap.values()).sort((a, b) => a.title.localeCompare(b.title));
});

/** All artists (derived from tracks) */
export const artists = derived(tracks, ($tracks) => {
  const artistMap = new Map<string, Artist>();
  const artistAlbums = new Map<string, Set<string>>();

  for (const track of $tracks) {
    const name = track.artist || 'Unknown Artist';
    if (!artistMap.has(name)) {
      artistMap.set(name, {
        id: name,
        name,
        album_count: 0,
        track_count: 0,
        artwork_path: track.artwork_path,
      });
      artistAlbums.set(name, new Set());
    }
    const artist = artistMap.get(name)!;
    artist.track_count += 1;
    if (track.album) {
      artistAlbums.get(name)!.add(track.album);
    }
  }

  for (const [name, albums] of artistAlbums) {
    const artist = artistMap.get(name)!;
    artist.album_count = albums.size;
  }

  return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
});

/** Sort settings */
export const sortField = writable<SortField>('title');
export const sortDirection = writable<SortDirection>('asc');

/** Filtered + sorted tracks (search is client-side for now). */
export const visibleTracks = derived(
  [tracks, searchQuery, sortField, sortDirection],
  ([$tracks, $query, $field, $dir]) => {
    const q = $query.trim().toLowerCase();
    let list = $tracks;

    if (q.length > 0) {
      list = list.filter((t) => {
        const hay = `${t.title} ${t.artist} ${t.album} ${t.album_artist ?? ''} ${t.genre ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const dirMul = $dir === 'asc' ? 1 : -1;
    const byString = (a: string, b: string) => a.localeCompare(b);

    return [...list].sort((a, b) => {
      switch ($field) {
        case 'title':
          return dirMul * byString(a.title, b.title);
        case 'artist':
          return dirMul * byString(a.artist, b.artist);
        case 'album':
          return dirMul * byString(a.album, b.album);
        case 'year':
          return dirMul * ((a.year ?? 0) - (b.year ?? 0));
        case 'duration':
          return dirMul * (a.duration - b.duration);
        case 'date_added':
          return dirMul * byString(a.date_added, b.date_added);
        case 'play_count':
          return dirMul * (a.play_count - b.play_count);
        default:
          return 0;
      }
    });
  }
);

/** Library loading state */
export const libraryLoading = writable(false);

/** Library scan progress */
export const scanProgress = writable<{ total: number; scanned: number; phase: string } | null>(null);

/** Track count */
export const trackCount = derived(tracks, ($tracks) => $tracks.length);
