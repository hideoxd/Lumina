use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: Option<i32>,
    pub duration: f64,
    pub file_path: String,
    pub file_format: String,
    pub file_size: i64,
    pub bitrate: Option<i32>,
    pub sample_rate: Option<i32>,
    pub artwork_path: Option<String>,
    pub date_added: String,
    pub last_played: Option<String>,
    pub play_count: i32,
    pub favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub description: String,
    pub artwork_path: Option<String>,
    pub track_count: i64,
    pub total_duration: f64,
    pub created_at: String,
    pub updated_at: String,
    pub is_smart: bool,
    pub smart_rules: Option<JsonValue>,
}
