pub mod audio;
pub mod database;
pub mod library;
pub mod utils;
pub mod youtube;

use tauri::Manager;
use std::sync::Mutex;
use std::path::PathBuf;

use audio::AudioState;
use audio::engine::AudioEngine;
use library::watcher::FolderWatcher;

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_app_name() -> String {
    "Lumina".to_string()
}

#[tauri::command]
fn watch_directory(state: tauri::State<'_, Mutex<FolderWatcher>>, path: String) -> Result<(), String> {
    let mut watcher = state.lock().map_err(|e| e.to_string())?;
    watcher.watch_directory(&path)
}

#[tauri::command]
fn unwatch_directory(state: tauri::State<'_, Mutex<FolderWatcher>>, path: String) -> Result<(), String> {
    let mut watcher = state.lock().map_err(|e| e.to_string())?;
    watcher.unwatch_directory(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize App Data Directory
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            
            // Initialize Database (non-fatal on failure)
            match database::init_db(app_data_dir.clone()) {
                Ok(db_state) => { app.manage(db_state); }
                Err(e) => { eprintln!("[lumina] Database init skipped: {e}"); }
            }

            // Initialize Audio Engine (non-fatal on failure)
            match AudioEngine::new() {
                Ok(engine) => {
                    app.manage(AudioState {
                        engine: Mutex::new(engine),
                    });
                }
                Err(e) => { eprintln!("[lumina] Audio engine init skipped: {e}"); }
            }

            // Initialize Folder Watcher (non-fatal on failure)
            match FolderWatcher::new(app.handle().clone()) {
                Ok(watcher) => { app.manage(Mutex::new(watcher)); }
                Err(e) => { eprintln!("[lumina] Folder watcher init skipped: {e}"); }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_app_name,
            audio::play_file,
            audio::play_file_at,
            audio::pause_audio,
            audio::resume_audio,
            audio::stop_audio,
            audio::set_volume,
            library::scan_directory,
            library::get_all_tracks,
            library::set_track_favorite,
            library::edit_track_metadata,
            library::mark_track_played,
            library::get_favorite_tracks,
            library::get_recent_tracks,
            library::search_tracks,
            library::create_playlist,
            library::get_all_playlists,
            library::get_playlist,
            library::delete_playlist,
            library::rename_playlist,
            library::get_playlist_tracks,
            library::add_track_to_playlist,
            library::remove_track_from_playlist,
            watch_directory,
            unwatch_directory,
            youtube::download_youtube,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
