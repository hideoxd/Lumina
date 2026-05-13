pub mod metadata;
pub mod scanner;
// pub mod watcher; // implement later if needed

use tauri::{AppHandle, command, State};
use crate::database::{queries, DbState, models::Track};

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
