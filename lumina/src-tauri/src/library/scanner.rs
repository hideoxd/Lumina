use walkdir::WalkDir;
use tauri::{AppHandle, Manager, Emitter};
use rayon::prelude::*;
use std::sync::{Arc, Mutex};

use crate::database::{queries, DbState};
use crate::library::metadata::extract_metadata;

#[derive(Clone, serde::Serialize)]
pub struct ScanProgressEvent {
    pub total: usize,
    pub scanned: usize,
    pub phase: String,
    pub current_file: String,
}

pub fn scan_directory(app_handle: &AppHandle, target_dir: &str) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // 1. Collect all valid audio files
    let mut files = Vec::new();
    let valid_exts = ["mp3", "flac", "wav", "m4a", "ogg", "aac", "aiff", "wma", "opus", "webm"];
    
    for entry in WalkDir::new(target_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if valid_exts.contains(&ext.to_string_lossy().to_lowercase().as_str()) {
                    files.push(path.to_path_buf());
                }
            }
        }
    }

    let total = files.len();
    if total == 0 {
        return Ok(());
    }

    // 2. Process metadata in parallel
    // We use a mutex to collect successful tracks and report progress safely
    let scanned_count = Arc::new(Mutex::new(0));
    let tracks = Arc::new(Mutex::new(Vec::new()));

    files.par_iter().for_each(|file_path| {
        if let Ok(track) = extract_metadata(file_path, &app_data_dir) {
            tracks.lock().unwrap().push(track);
        }
        
        let mut count = scanned_count.lock().unwrap();
        *count += 1;
        
        // Emit progress every 10 files to avoid overwhelming IPC
        if *count % 10 == 0 || *count == total {
            let _ = app_handle.emit("scan-progress", ScanProgressEvent {
                total,
                scanned: *count,
                phase: "reading_metadata".to_string(),
                current_file: file_path.to_string_lossy().to_string(),
            });
        }
    });

    // 3. Save to database
    let db_state = app_handle.state::<DbState>();
    let mut conn = db_state.conn.lock().map_err(|_| "Failed to lock db".to_string())?;
    
    let tracks_guard = tracks.lock().unwrap();
    
    let _ = app_handle.emit("scan-progress", ScanProgressEvent {
        total,
        scanned: total,
        phase: "saving".to_string(),
        current_file: "".to_string(),
    });

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for track in tracks_guard.iter() {
        queries::insert_track(&tx, track).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    let _ = app_handle.emit("scan-progress", ScanProgressEvent {
        total,
        scanned: total,
        phase: "complete".to_string(),
        current_file: "".to_string(),
    });

    Ok(())
}
