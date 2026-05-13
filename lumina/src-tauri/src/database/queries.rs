use rusqlite::{params, Connection, Result};
use super::models::Track;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
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
    let track_iter = stmt.query_map([], |row| {
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
    })?;

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
    let track_iter = stmt.query_map(params![limit as i64], |row| {
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
    })?;

    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}

pub fn get_all_tracks(conn: &Connection) -> Result<Vec<Track>> {
    let mut stmt = conn.prepare("SELECT * FROM tracks ORDER BY artist, album, track_number, title")?;
    let track_iter = stmt.query_map([], |row| {
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
    })?;

    let mut tracks = Vec::new();
    for track in track_iter {
        tracks.push(track?);
    }
    Ok(tracks)
}
