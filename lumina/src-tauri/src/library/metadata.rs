use std::fs;
use std::path::Path;
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey};
use lofty::file::{AudioFile, TaggedFileExt};
use uuid::Uuid;
use chrono::Utc;

use crate::database::models::Track;
use crate::utils::artwork;

pub fn extract_metadata(
    path: &Path,
    app_data_dir: &Path,
) -> Result<Track, String> {
    let mut tagged_file = Probe::open(path)
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;

    let tag = tagged_file.primary_tag_mut().or_else(|| tagged_file.first_tag_mut());
    let properties = tagged_file.properties();

    let mut title = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
    let mut artist = "Unknown Artist".to_string();
    let mut album = "Unknown Album".to_string();
    let mut album_artist = None;
    let mut genre = None;
    let mut year = None;
    let mut track_number = None;
    let mut disc_number = None;
    let mut artwork_path = None;

    if let Some(t) = tag {
        if let Some(val) = t.title() { title = val.into_owned(); }
        if let Some(val) = t.artist() { artist = val.into_owned(); }
        if let Some(val) = t.album() { album = val.into_owned(); }
        
        album_artist = t.get_string(&ItemKey::AlbumArtist).map(|s: &str| s.to_string());
        genre = t.get_string(&ItemKey::Genre).map(|s: &str| s.to_string());
        year = t.get_string(&ItemKey::Year).and_then(|s: &str| s.parse::<i32>().ok());
        track_number = t.get_string(&ItemKey::TrackNumber).and_then(|s: &str| s.parse::<i32>().ok());
        disc_number = t.get_string(&ItemKey::DiscNumber).and_then(|s: &str| s.parse::<i32>().ok());

        // Extract artwork
        if let Some(pic) = t.pictures().first() {
            if let Ok(filename) = artwork::save_artwork(app_data_dir, pic) {
                artwork_path = Some(filename);
            }
        }
    }

    let file_metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let duration = properties.duration().as_secs_f64();
    let bitrate = properties.audio_bitrate().map(|b| b as i32);
    let sample_rate = properties.sample_rate().map(|s| s as i32);
    let file_format = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    let file_path = path.to_string_lossy().to_string();
    let id = Uuid::new_v5(&Uuid::NAMESPACE_URL, file_path.as_bytes()).to_string();

    Ok(Track {
        id,
        title,
        artist,
        album,
        album_artist,
        genre,
        year,
        track_number,
        disc_number,
        duration,
        file_path,
        file_format,
        file_size: file_metadata.len() as i64,
        bitrate,
        sample_rate,
        artwork_path,
        date_added: Utc::now().to_rfc3339(),
        last_played: None,
        play_count: 0,
        favorite: false,
    })
}
