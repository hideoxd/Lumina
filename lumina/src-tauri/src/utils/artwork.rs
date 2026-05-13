use std::fs;
use std::path::{Path, PathBuf};
use lofty::picture::Picture;
use uuid::Uuid;

pub fn save_artwork(
    app_data_dir: &Path,
    picture: &Picture,
) -> Result<String, String> {
    let artworks_dir = app_data_dir.join("artworks");
    if !artworks_dir.exists() {
        fs::create_dir_all(&artworks_dir).map_err(|e| e.to_string())?;
    }

    let mime = picture.mime_type().map(|m| m.to_string());
    let ext = match mime.as_deref() {
        Some("image/jpeg") => "jpg",
        Some("image/png") => "png",
        Some("image/webp") => "webp",
        _ => "img",
    };

    // Calculate a hash of the image data to avoid duplicates, or just use UUID
    // For simplicity, we use UUID
    let filename = format!("{}.{}", Uuid::new_v4(), ext);
    let path = artworks_dir.join(&filename);

    fs::write(&path, picture.data()).map_err(|e| e.to_string())?;

    // Return the relative path to be served via a custom protocol or local file
    // Using tauri's asset protocol later, but for now just the absolute path or a safe relative one.
    // For local files we can just store the filename and construct it, or store the absolute path.
    // Let's store the filename.
    Ok(filename)
}

pub fn get_artwork_path(app_data_dir: &Path, filename: &str) -> PathBuf {
    app_data_dir.join("artworks").join(filename)
}
