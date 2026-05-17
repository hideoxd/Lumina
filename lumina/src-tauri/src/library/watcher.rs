use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::Mutex;
use crate::database::{queries, DbState};
use crate::library::metadata::extract_metadata;

#[derive(Clone, serde::Serialize)]
pub struct WatchEvent {
    pub kind: String,
    pub path: String,
    pub success: bool,
}

pub struct FolderWatcher {
    pub watched_dirs: Arc<Mutex<Vec<PathBuf>>>,
    _watcher: RecommendedWatcher,
}

impl FolderWatcher {
    pub fn new(app_handle: AppHandle) -> Result<Self, String> {
        let watched_dirs: Arc<Mutex<Vec<PathBuf>>> = Arc::new(Mutex::new(Vec::new()));
        let app = app_handle.clone();

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    if let Some(path) = event.paths.first() {
                        let ext = path.extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase();
                        let valid = ["mp3", "flac", "wav", "m4a", "ogg", "aac", "aiff", "wma", "opus"];
                        if !valid.contains(&ext.as_str()) {
                            return;
                        }

                        let is_add = matches!(&event.kind,
                            EventKind::Create(_) | EventKind::Modify(_)
                        );
                        let is_remove = matches!(&event.kind,
                            EventKind::Remove(_)
                        );

                        if is_add {
                            let app_data_dir = app.path().app_data_dir().ok();
                            if let Some(ref dir) = app_data_dir {
                                if let Ok(track) = extract_metadata(path, dir) {
                                    let db = app.state::<DbState>();
                                    if let Ok(conn) = db.conn.lock() {
                                        let _ = queries::insert_track(&conn, &track);
                                    }
                                    let _ = app.emit("watch-event", WatchEvent {
                                        kind: "added".to_string(),
                                        path: path.to_string_lossy().to_string(),
                                        success: true,
                                    });
                                }
                            }
                        } else if is_remove {
                            if let Some(file_path) = path.to_str().map(|s| s.to_string()) {
                                let db = app.state::<DbState>();
                                if let Ok(conn) = db.conn.lock() {
                                    let _ = conn.execute(
                                        "DELETE FROM tracks WHERE file_path=?1",
                                        rusqlite::params![file_path],
                                    );
                                }
                                let _ = app.emit("watch-event", WatchEvent {
                                    kind: "removed".to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    success: true,
                                });
                            }
                        }
                    }
                }
            },
            Config::default(),
        ).map_err(|e| format!("Failed to create watcher: {e}"))?;

        Ok(Self {
            watched_dirs,
            _watcher: watcher,
        })
    }

    pub fn watch_directory(&mut self, path: &str) -> Result<(), String> {
        let path = PathBuf::from(path);
        self._watcher.watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch directory: {e}"))?;
        {
            let mut dirs = self.watched_dirs.lock();
            if !dirs.contains(&path) {
                dirs.push(path);
            }
        }
        Ok(())
    }

    pub fn unwatch_directory(&mut self, path: &str) -> Result<(), String> {
        let path = PathBuf::from(path);
        self._watcher.unwatch(&path)
            .map_err(|e| format!("Failed to unwatch directory: {e}"))?;
        {
            let mut dirs = self.watched_dirs.lock();
            dirs.retain(|d| d != &path);
        }
        Ok(())
    }
}
