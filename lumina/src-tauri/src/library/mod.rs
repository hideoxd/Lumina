pub mod metadata;
pub mod scanner;
pub mod watcher;

use tauri::{AppHandle, command, State};
use crate::database::{queries, DbState, models::{Track, Playlist}};
use uuid::Uuid;
use chrono::Utc;

#[command]
pub async fn scan_directory(app: AppHandle, path: String) -> Result<(), String> {
    // Run in a separate thread so we don't block the Tauri IPC
    tauri::async_runtime::spawn_blocking(move || {
        scanner::scan_directory(&app, &path)
    }).await.map_err(|e| e.to_string())??;
    Ok(())
}

#[command]
pub fn get_all_tracks(db: State<'_, DbState>) -> Result<Vec<Track>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::get_all_tracks(&conn).map_err(|e| e.to_string())
}

#[command]
pub fn set_track_favorite(db: State<'_, DbState>, track_id: String, favorite: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::set_track_favorite(&conn, &track_id, favorite).map_err(|e| e.to_string())
}

#[command]
pub fn mark_track_played(db: State<'_, DbState>, track_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::mark_track_played(&conn, &track_id).map_err(|e| e.to_string())
}

#[command]
pub fn get_favorite_tracks(db: State<'_, DbState>) -> Result<Vec<Track>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::get_favorite_tracks(&conn).map_err(|e| e.to_string())
}

#[command]
pub fn get_recent_tracks(db: State<'_, DbState>, limit: Option<u32>) -> Result<Vec<Track>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    let limit = limit.unwrap_or(50).min(500) as usize;
    queries::get_recent_tracks(&conn, limit).map_err(|e| e.to_string())
}

#[command]
pub fn search_tracks(db: State<'_, DbState>, query: String) -> Result<Vec<Track>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::search_tracks(&conn, &query).map_err(|e| e.to_string())
}

// ── Playlist Commands ──

#[command]
pub fn create_playlist(db: State<'_, DbState>, name: String, description: Option<String>, is_smart: Option<bool>, smart_rules: Option<serde_json::Value>) -> Result<Playlist, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    let now = Utc::now().to_rfc3339();
    let playlist = Playlist {
        id: Uuid::new_v4().to_string(),
        name,
        description: description.unwrap_or_default(),
        artwork_path: None,
        track_count: 0,
        total_duration: 0.0,
        created_at: now.clone(),
        updated_at: now,
        is_smart: is_smart.unwrap_or(false),
        smart_rules,
    };
    queries::create_playlist(&conn, &playlist).map_err(|e| e.to_string())?;
    Ok(playlist)
}

#[command]
pub fn get_all_playlists(db: State<'_, DbState>) -> Result<Vec<Playlist>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::get_all_playlists(&conn).map_err(|e| e.to_string())
}

#[command]
pub fn get_playlist(db: State<'_, DbState>, playlist_id: String) -> Result<Option<Playlist>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::get_playlist(&conn, &playlist_id).map_err(|e| e.to_string())
}

#[command]
pub fn delete_playlist(db: State<'_, DbState>, playlist_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::delete_playlist(&conn, &playlist_id).map_err(|e| e.to_string())
}

#[command]
pub fn rename_playlist(db: State<'_, DbState>, playlist_id: String, name: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    let mut playlist = queries::get_playlist(&conn, &playlist_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Playlist not found".to_string())?;
    playlist.name = name;
    queries::update_playlist(&conn, &playlist).map_err(|e| e.to_string())
}

#[command]
pub fn get_playlist_tracks(db: State<'_, DbState>, playlist_id: String) -> Result<Vec<Track>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::get_playlist_tracks(&conn, &playlist_id).map_err(|e| e.to_string())
}

#[command]
pub fn add_track_to_playlist(db: State<'_, DbState>, playlist_id: String, track_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::add_track_to_playlist(&conn, &playlist_id, &track_id).map_err(|e| e.to_string())
}

#[command]
pub fn remove_track_from_playlist(db: State<'_, DbState>, playlist_id: String, track_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    queries::remove_track_from_playlist(&conn, &playlist_id, &track_id).map_err(|e| e.to_string())
}
