pub mod migrations;
pub mod models;
pub mod queries;

use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app_data_dir: PathBuf) -> Result<DbState, String> {
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }

    let db_path = app_data_dir.join("library.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Apply schema migrations
    migrations::apply_migrations(&conn).map_err(|e| e.to_string())?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}
