use rusqlite::Connection;

pub fn apply_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create tracks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT NOT NULL,
            album_artist TEXT,
            genre TEXT,
            year INTEGER,
            track_number INTEGER,
            disc_number INTEGER,
            duration REAL NOT NULL,
            file_path TEXT UNIQUE NOT NULL,
            file_format TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            bitrate INTEGER,
            sample_rate INTEGER,
            artwork_path TEXT,
            date_added TEXT NOT NULL,
            last_played TEXT,
            play_count INTEGER DEFAULT 0,
            favorite BOOLEAN DEFAULT 0
        )",
        [],
    )?;

    // Create FTS5 virtual table for fast full-text search
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
            title, artist, album, genre,
            content='tracks', content_rowid='rowid'
        )",
        [],
    )?;

    // Create triggers to keep FTS table in sync
    conn.execute_batch(
        "
        CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
            INSERT INTO tracks_fts(rowid, title, artist, album, genre)
            VALUES (new.rowid, new.title, new.artist, new.album, new.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
            INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, genre)
            VALUES ('delete', old.rowid, old.title, old.artist, old.album, old.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
            INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, genre)
            VALUES ('delete', old.rowid, old.title, old.artist, old.album, old.genre);
            INSERT INTO tracks_fts(rowid, title, artist, album, genre)
            VALUES (new.rowid, new.title, new.artist, new.album, new.genre);
        END;
        "
    )?;

    // Playlists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            artwork_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_smart BOOLEAN NOT NULL DEFAULT 0,
            smart_rules TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS playlist_tracks (
            playlist_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            added_at TEXT NOT NULL,
            PRIMARY KEY (playlist_id, track_id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS playlist_tracks_by_playlist ON playlist_tracks(playlist_id, position)",
        [],
    )?;

    Ok(())
}
