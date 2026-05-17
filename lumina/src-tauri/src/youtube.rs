use tauri::{AppHandle, command, Manager};
use std::path::PathBuf;
use std::fs;
use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};

#[command]
pub async fn download_youtube(app: AppHandle, url: String) -> Result<String, String> {
    // Determine a downloads folder
    let download_dir = app.path().download_dir().map_err(|_| "Could not find download dir".to_string())?.join("LuminaDownloads");
    
    if !download_dir.exists() {
        fs::create_dir_all(&download_dir).map_err(|e| e.to_string())?;
    }

    let video_options = VideoOptions {
        quality: VideoQuality::HighestAudio,
        filter: VideoSearchOptions::Audio,
        ..Default::default()
    };

    let video = Video::new_with_options(&url, video_options).map_err(|e| e.to_string())?;
    let info = video.get_info().await.map_err(|e| e.to_string())?;
    
    // Sanitize title for filename
    let safe_title = info.video_details.title.replace(|c: char| !c.is_alphanumeric() && c != ' ', "_");
    
    let file_path = download_dir.join(format!("{}.mp3", safe_title));
    
    video.download(file_path.clone()).await.map_err(|e| e.to_string())?;
    
    // Scan this directory into the library
    crate::library::scanner::scan_directory(&app, &download_dir.to_string_lossy().to_string()).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}
