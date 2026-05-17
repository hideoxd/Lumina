use rusqlite::{params, Connection, Result};
use super::models::{Track, Playlist};

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn row_to_track(row: &rusqlite::Row) -> rusqlite::Result<Track> {
    Ok(Track {
        id: row.get("id")?,
        title: row.get("title")?,
        artist: row.get("artist")?,
        album: row.get("album")?,
        album_artist: row.get("album_artist")?,
        genre: row.get("genre")?,
        year: row.get("year")?,
        track_number: row.get("track_number")?,
        disc_number: row.get("disc_number")?,
        duration: row.get("duration")?,
        file_path: row.get("file_path")?,
        file_format: row.get("file_format")?,
        file_size: row.get("file_size")?,
        bitrate: row.get("bitrate")?,
        sample_rate: row.get("sample_rate")?,
        artwork_path: row.get("artwork_path")?,
        date_added: row.get("date_added")?,
        last_played: row.get("last_played")?,
        play_count: row.get("play_count")?,
        favorite: row.get("favorite")?,
    })
}

pub fn insert_track(conn: &Connection, track: &Track) -> Result<()> {
    // Preserve user-facing data on re-scan: date_added, last_played, play_count, favorite.
    // We conflict on file_path (unique) and update only metadata-like fields.
    conn.execute(
        "INSERT INTO tracks (
            id, title, artist, album, album_artist, genre, year,
            track_number, disc_number, duration, file_path, file_format,
            file_size, bitrate, sample_rate, artwork_path, date_added,
            last_played, play_count, favorite
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
            ?14, ?15, ?16, ?17, ?18, ?19, ?20
        )
        ON CONFLICT(file_path) DO UPDATE SET
            title=excluded.title,
            artist=excluded.artist,
            album=excluded.album,
            album_artist=excluded.album_artist,
            genre=excluded.genre,
            year=excluded.year,
            track_number=excluded.track_number,
            disc_number=excluded.disc_number,
            duration=excluded.duration,
            file_format=excluded.file_format,
            file_size=excluded.file_size,
            bitrate=excluded.bitrate,
            sample_rate=excluded.sample_rate,
            artwork_path=excluded.artwork_path",
        params![
            track.id,
            track.title,
            track.artist,
            track.album,
            track.album_artist,
            track.genre,
            track.year,
            track.track_number,
            track.disc_number,
            track.duration,
            track.file_path,
            track.file_format,
            track.file_size,
            track.bitrate,
            track.sample_rate,
            track.artwork_path,
            track.date_added,
            track.last_played,
            track.play_count,
            track.favorite,
        ],
    )?;
    Ok(())
}

pub fn set_track_favorite(conn: &Connection, track_id: &str, favorite: bool) -> Result<()> {
    conn.execute(
        "UPDATE tracks SET favorite=?1 WHERE id=?2",
        params![favorite, track_id],
    )?;
    Ok(())
}

pub fn mark_track_played(conn: &Connection, track_id: &str) -> Result<()> {
    let now = now_iso();
    conn.execute(
        "UPDATE tracks
         SET last_played=?1,
             play_count=COALESCE(play_count, 0) + 1
         WHERE id=?2",
        params![now, track_id],
    )?;
    Ok(())
}

pub fn get_favorite_tracks(conn: &Connection) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM tracks WHERE favorite=1 ORDER BY artist, album, track_number, title",
    )?;
    let track_iter = stmt.query_map([], row_to_track)?;
    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

pub fn get_recent_tracks(conn: &Connection, limit: usize) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM tracks WHERE last_played IS NOT NULL ORDER BY last_played DESC LIMIT ?1",
    )?;
    let track_iter = stmt.query_map(params![limit as i64], row_to_track)?;
    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

pub fn get_all_tracks(conn: &Connection) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare("SELECT * FROM tracks ORDER BY artist, album, track_number, title")?;
    let track_iter = stmt.query_map([], row_to_track)?;
    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

pub fn search_tracks(conn: &Connection, query: &str) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT tracks.* FROM tracks
         JOIN tracks_fts ON tracks.rowid = tracks_fts.rowid
         WHERE tracks_fts MATCH ?1
         ORDER BY rank",
    )?;
    let search_query = format!("{}*", query);
    let track_iter = stmt.query_map(params![search_query], row_to_track)?;
    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

// ── Playlist Queries ──

pub fn create_playlist(conn: &Connection, playlist: &Playlist) -> Result<()> {
    let smart_rules_str = playlist.smart_rules.as_ref().map(|v| v.to_string());
    conn.execute(
        "INSERT INTO playlists (id, name, description, artwork_path, created_at, updated_at, is_smart, smart_rules)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            playlist.id,
            playlist.name,
            playlist.description,
            playlist.artwork_path,
            playlist.created_at,
            playlist.updated_at,
            playlist.is_smart,
            smart_rules_str,
        ],
    )?;
    Ok(())
}

pub fn get_all_playlists(conn: &Connection) -> Result<Vec<Playlist>> {
    let mut stmt = conn.prepare(
        "SELECT p.*,
                COALESCE(pt.track_count, 0) AS track_count,
                COALESCE(pt.total_duration, 0.0) AS total_duration
         FROM playlists p
         LEFT JOIN (
             SELECT playlist_id,
                    COUNT(*) AS track_count,
                    COALESCE(SUM(t.duration), 0.0) AS total_duration
             FROM playlist_tracks pt
             JOIN tracks t ON t.id = pt.track_id
             GROUP BY playlist_id
         ) pt ON pt.playlist_id = p.id
         ORDER BY p.name",
    )?;
    fn row_to_playlist(row: &rusqlite::Row) -> rusqlite::Result<Playlist> {
        let smart_rules_str: Option<String> = row.get("smart_rules")?;
        let smart_rules = smart_rules_str
            .and_then(|s| serde_json::from_str(&s).ok());
        Ok(Playlist {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            artwork_path: row.get("artwork_path")?,
            track_count: row.get("track_count")?,
            total_duration: row.get("total_duration")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            is_smart: row.get("is_smart")?,
            smart_rules,
        })
    }

    let iter = stmt.query_map([], row_to_playlist)?;
    let mut playlists = Vec::new();
    for p in iter {
        playlists.push(p?);
    }
    Ok(playlists)
}

pub fn get_playlist(conn: &Connection, playlist_id: &str) -> Result<Option<Playlist>> {
    let mut stmt = conn.prepare(
        "SELECT p.*,
                COALESCE(pt.track_count, 0) AS track_count,
                COALESCE(pt.total_duration, 0.0) AS total_duration
         FROM playlists p
         LEFT JOIN (
             SELECT playlist_id, COUNT(*) AS track_count, COALESCE(SUM(t.duration), 0.0) AS total_duration
             FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
             GROUP BY playlist_id
         ) pt ON pt.playlist_id = p.id
         WHERE p.id = ?1",
    )?;
    let mut iter = stmt.query_map(params![playlist_id], |row| {
        let smart_rules_str: Option<String> = row.get("smart_rules")?;
        let smart_rules = smart_rules_str
            .and_then(|s| serde_json::from_str(&s).ok());
        Ok(Playlist {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            artwork_path: row.get("artwork_path")?,
            track_count: row.get("track_count")?,
            total_duration: row.get("total_duration")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            is_smart: row.get("is_smart")?,
            smart_rules,
        })
    })?;
    Ok(iter.next().transpose()?)
}

pub fn update_playlist(conn: &Connection, playlist: &Playlist) -> Result<()> {
    let smart_rules_str = playlist.smart_rules.as_ref().map(|v| v.to_string());
    conn.execute(
        "UPDATE playlists SET name=?1, description=?2, artwork_path=?3, updated_at=?4, is_smart=?5, smart_rules=?6 WHERE id=?7",
        params![
            playlist.name,
            playlist.description,
            playlist.artwork_path,
            now_iso(),
            playlist.is_smart,
            smart_rules_str,
            playlist.id,
        ],
    )?;
    Ok(())
}

pub fn delete_playlist(conn: &Connection, playlist_id: &str) -> Result<()> {
    conn.execute("DELETE FROM playlist_tracks WHERE playlist_id=?1", params![playlist_id])?;
    conn.execute("DELETE FROM playlists WHERE id=?1", params![playlist_id])?;
    Ok(())
}

pub fn get_playlist_tracks(conn: &Connection, playlist_id: &str) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT t.* FROM tracks t
         JOIN playlist_tracks pt ON pt.track_id = t.id
         WHERE pt.playlist_id = ?1
         ORDER BY pt.position",
    )?;
    let track_iter = stmt.query_map(params![playlist_id], row_to_track)?;
    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

pub fn add_track_to_playlist(conn: &Connection, playlist_id: &str, track_id: &str) -> Result<()> {
    let max_pos: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), -1) FROM playlist_tracks WHERE playlist_id=?1",
        params![playlist_id],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?1, ?2, ?3, ?4)",
        params![playlist_id, track_id, max_pos + 1, now_iso()],
    )?;
    Ok(())
}

pub fn remove_track_from_playlist(conn: &Connection, playlist_id: &str, track_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id=?1 AND track_id=?2",
        params![playlist_id, track_id],
    )?;
    Ok(())
}

pub fn reorder_playlist_track(conn: &Connection, playlist_id: &str, track_id: &str, new_position: i64) -> Result<()> {
    conn.execute(
        "UPDATE playlist_tracks SET position=?1 WHERE playlist_id=?2 AND track_id=?3",
        params![new_position, playlist_id, track_id],
    )?;
    Ok(())
}
