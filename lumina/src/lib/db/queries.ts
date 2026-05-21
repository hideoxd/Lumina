/* ============================================================
   Lumina — Database Query Layer (sql.js)
   ============================================================ */

import { getDb, saveDb } from './index';
import type { Track, Playlist, SmartPlaylistRule } from '$lib/types';

/* ── Row → Model helpers ──────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTrack(row: Record<string, any>): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    album_artist: row.album_artist ?? null,
    genre: row.genre ?? null,
    year: row.year ?? null,
    track_number: row.track_number ?? null,
    disc_number: row.disc_number ?? null,
    duration: row.duration,
    file_path: row.file_path,
    file_format: row.file_format,
    file_size: row.file_size,
    bitrate: row.bitrate ?? null,
    sample_rate: row.sample_rate ?? null,
    composer: row.composer ?? null,
    publisher: row.publisher ?? null,
    comments: row.comments ?? null,
    artwork_path: row.artwork_path ?? null,
    date_added: row.date_added,
    last_played: row.last_played ?? null,
    play_count: row.play_count ?? 0,
    favorite: Boolean(row.favorite),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPlaylist(row: Record<string, any>): Playlist {
  let smartRules: SmartPlaylistRule[] | null = null;
  if (row.smart_rules) {
    try {
      smartRules = JSON.parse(row.smart_rules) as SmartPlaylistRule[];
    } catch {
      smartRules = null;
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    artwork_path: row.artwork_path ?? null,
    track_count: row.track_count ?? 0,
    total_duration: row.total_duration ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_smart: Boolean(row.is_smart),
    smart_rules: smartRules,
  };
}

/* ── Track Queries ────────────────────────────────────────── */

/**
 * INSERT OR REPLACE a track.
 * On conflict (file_path) the existing date_added, last_played,
 * play_count and favorite values are preserved.
 */
export async function insertTrack(track: Track): Promise<void> {
  const db = await getDb();

  db.run(
    `INSERT INTO tracks (
       id, title, artist, album, album_artist, genre, year,
       track_number, disc_number, duration, file_path, file_format,
       file_size, bitrate, sample_rate, composer, publisher, comments,
       artwork_path, date_added, last_played, play_count, favorite
     ) VALUES (
       $id, $title, $artist, $album, $album_artist, $genre, $year,
       $track_number, $disc_number, $duration, $file_path, $file_format,
       $file_size, $bitrate, $sample_rate, $composer, $publisher, $comments,
       $artwork_path, $date_added, $last_played, $play_count, $favorite
     )
     ON CONFLICT(file_path) DO UPDATE SET
       id            = excluded.id,
       title         = excluded.title,
       artist        = excluded.artist,
       album         = excluded.album,
       album_artist  = excluded.album_artist,
       genre         = excluded.genre,
       year          = excluded.year,
       track_number  = excluded.track_number,
       disc_number   = excluded.disc_number,
       duration      = excluded.duration,
       file_format   = excluded.file_format,
       file_size     = excluded.file_size,
       bitrate       = excluded.bitrate,
       sample_rate   = excluded.sample_rate,
       composer      = excluded.composer,
       publisher     = excluded.publisher,
       comments      = excluded.comments,
       artwork_path  = excluded.artwork_path,
       date_added    = tracks.date_added,
       last_played   = tracks.last_played,
       play_count    = tracks.play_count,
       favorite      = tracks.favorite`,
    {
      $id: track.id,
      $title: track.title,
      $artist: track.artist,
      $album: track.album,
      $album_artist: track.album_artist,
      $genre: track.genre,
      $year: track.year,
      $track_number: track.track_number,
      $disc_number: track.disc_number,
      $duration: track.duration,
      $file_path: track.file_path,
      $file_format: track.file_format,
      $file_size: track.file_size,
      $bitrate: track.bitrate,
      $sample_rate: track.sample_rate,
      $composer: track.composer,
      $publisher: track.publisher,
      $comments: track.comments,
      $artwork_path: track.artwork_path,
      $date_added: track.date_added,
      $last_played: track.last_played,
      $play_count: track.play_count,
      $favorite: track.favorite ? 1 : 0,
    },
  );

  await saveDb();
}

/** Return every track ordered by artist → album → track number → title. */
export async function getAllTracks(): Promise<Track[]> {
  const db = await getDb();
  const stmt = db.prepare(
    'SELECT * FROM tracks ORDER BY artist, album, track_number, title',
  );

  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(rowToTrack(stmt.getAsObject()));
  }
  stmt.free();
  return tracks;
}

/**
 * Dynamically update only the provided metadata fields on a track.
 * Allowed fields: title, artist, album, album_artist, genre, year,
 * track_number, disc_number, composer, publisher, comments, artwork_path.
 */
export async function updateTrackMetadata(
  trackId: string,
  fields: Partial<
    Pick<
      Track,
      | 'title'
      | 'artist'
      | 'album'
      | 'album_artist'
      | 'genre'
      | 'year'
      | 'track_number'
      | 'disc_number'
      | 'composer'
      | 'publisher'
      | 'comments'
      | 'artwork_path'
    >
  >,
): Promise<void> {
  const allowedKeys = new Set([
    'title',
    'artist',
    'album',
    'album_artist',
    'genre',
    'year',
    'track_number',
    'disc_number',
    'composer',
    'publisher',
    'comments',
    'artwork_path',
  ]);

  const entries = Object.entries(fields).filter(([k]) => allowedKeys.has(k));
  if (entries.length === 0) return;

  const setClauses = entries.map(([k]) => `${k} = $${k}`).join(', ');
  const params: Record<string, string | number | null> = { $id: trackId };
  for (const [k, v] of entries) {
    if (v !== undefined) params[`$${k}`] = v as string | number | null;
  }

  const db = await getDb();
  db.run(`UPDATE tracks SET ${setClauses} WHERE id = $id`, params);
  await saveDb();
}

/** Set or clear the favourite flag on a track. */
export async function setTrackFavorite(
  trackId: string,
  favorite: boolean,
): Promise<void> {
  const db = await getDb();
  db.run('UPDATE tracks SET favorite = $fav WHERE id = $id', {
    $fav: favorite ? 1 : 0,
    $id: trackId,
  });
  await saveDb();
}

/** Increment play_count and set last_played to the current ISO timestamp. */
export async function markTrackPlayed(trackId: string): Promise<void> {
  const db = await getDb();
  db.run(
    `UPDATE tracks
     SET play_count  = play_count + 1,
         last_played = $now
     WHERE id = $id`,
    { $now: new Date().toISOString(), $id: trackId },
  );
  await saveDb();
}

/** Return all tracks marked as favourite. */
export async function getFavoriteTracks(): Promise<Track[]> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM tracks WHERE favorite = 1');

  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(rowToTrack(stmt.getAsObject()));
  }
  stmt.free();
  return tracks;
}

/** Return the most recently played tracks. */
export async function getRecentTracks(limit: number): Promise<Track[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT * FROM tracks
     WHERE last_played IS NOT NULL
     ORDER BY last_played DESC
     LIMIT $limit`,
  );
  stmt.bind({ $limit: limit });

  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(rowToTrack(stmt.getAsObject()));
  }
  stmt.free();
  return tracks;
}

/** LIKE-based search across title, artist, album and genre. */
export async function searchTracks(query: string): Promise<Track[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  const stmt = db.prepare(
    `SELECT * FROM tracks
     WHERE title  LIKE $q
        OR artist LIKE $q
        OR album  LIKE $q
        OR genre  LIKE $q
     ORDER BY artist, album, track_number, title`,
  );
  stmt.bind({ $q: pattern });

  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(rowToTrack(stmt.getAsObject()));
  }
  stmt.free();
  return tracks;
}

/* ── Playlist Queries ─────────────────────────────────────── */

/** Create a new playlist. */
export async function createPlaylist(playlist: Playlist): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO playlists (
       id, name, description, artwork_path,
       created_at, updated_at, is_smart, smart_rules
     ) VALUES (
       $id, $name, $description, $artwork_path,
       $created_at, $updated_at, $is_smart, $smart_rules
     )`,
    {
      $id: playlist.id,
      $name: playlist.name,
      $description: playlist.description,
      $artwork_path: playlist.artwork_path,
      $created_at: playlist.created_at,
      $updated_at: playlist.updated_at,
      $is_smart: playlist.is_smart ? 1 : 0,
      $smart_rules: playlist.smart_rules
        ? JSON.stringify(playlist.smart_rules)
        : null,
    },
  );
  await saveDb();
}

/** Return all playlists with computed track_count and total_duration. */
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT
       p.*,
       COALESCE(agg.track_count, 0)    AS track_count,
       COALESCE(agg.total_duration, 0)  AS total_duration
     FROM playlists p
     LEFT JOIN (
       SELECT
         pt.playlist_id,
         COUNT(*)          AS track_count,
         SUM(t.duration)   AS total_duration
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       GROUP BY pt.playlist_id
     ) agg ON agg.playlist_id = p.id
     ORDER BY p.name`,
  );

  const playlists: Playlist[] = [];
  while (stmt.step()) {
    playlists.push(rowToPlaylist(stmt.getAsObject()));
  }
  stmt.free();
  return playlists;
}

/** Return a single playlist by ID, or null. */
export async function getPlaylist(
  playlistId: string,
): Promise<Playlist | null> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT
       p.*,
       COALESCE(agg.track_count, 0)    AS track_count,
       COALESCE(agg.total_duration, 0)  AS total_duration
     FROM playlists p
     LEFT JOIN (
       SELECT
         pt.playlist_id,
         COUNT(*)          AS track_count,
         SUM(t.duration)   AS total_duration
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       GROUP BY pt.playlist_id
     ) agg ON agg.playlist_id = p.id
     WHERE p.id = $id`,
  );
  stmt.bind({ $id: playlistId });

  let playlist: Playlist | null = null;
  if (stmt.step()) {
    playlist = rowToPlaylist(stmt.getAsObject());
  }
  stmt.free();
  return playlist;
}

/** Update an existing playlist's metadata. */
export async function updatePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDb();
  db.run(
    `UPDATE playlists SET
       name         = $name,
       description  = $description,
       artwork_path = $artwork_path,
       updated_at   = $updated_at,
       is_smart     = $is_smart,
       smart_rules  = $smart_rules
     WHERE id = $id`,
    {
      $id: playlist.id,
      $name: playlist.name,
      $description: playlist.description,
      $artwork_path: playlist.artwork_path,
      $updated_at: playlist.updated_at,
      $is_smart: playlist.is_smart ? 1 : 0,
      $smart_rules: playlist.smart_rules
        ? JSON.stringify(playlist.smart_rules)
        : null,
    },
  );
  await saveDb();
}

/** Delete a playlist and all its track associations. */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM playlist_tracks WHERE playlist_id = $id', {
    $id: playlistId,
  });
  db.run('DELETE FROM playlists WHERE id = $id', { $id: playlistId });
  await saveDb();
}

/* ── Playlist Track Queries ───────────────────────────────── */

/** Return all tracks belonging to a playlist, ordered by position. */
export async function getPlaylistTracks(
  playlistId: string,
): Promise<Track[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT t.*
     FROM playlist_tracks pt
     JOIN tracks t ON t.id = pt.track_id
     WHERE pt.playlist_id = $pid
     ORDER BY pt.position`,
  );
  stmt.bind({ $pid: playlistId });

  const tracks: Track[] = [];
  while (stmt.step()) {
    tracks.push(rowToTrack(stmt.getAsObject()));
  }
  stmt.free();
  return tracks;
}

/** Add a track to a playlist at the next available position. */
export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const db = await getDb();

  // Determine the next position
  const stmt = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = $pid',
  );
  stmt.bind({ $pid: playlistId });
  stmt.step();
  const nextPos = (stmt.getAsObject() as { next_pos: number }).next_pos;
  stmt.free();

  db.run(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
     VALUES ($pid, $tid, $pos, $now)`,
    {
      $pid: playlistId,
      $tid: trackId,
      $pos: nextPos,
      $now: new Date().toISOString(),
    },
  );
  await saveDb();
}

/** Remove a track from a playlist. */
export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const db = await getDb();
  db.run(
    'DELETE FROM playlist_tracks WHERE playlist_id = $pid AND track_id = $tid',
    { $pid: playlistId, $tid: trackId },
  );
  await saveDb();
}
