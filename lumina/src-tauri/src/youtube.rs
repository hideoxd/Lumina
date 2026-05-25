use tauri::{AppHandle, command, Manager};
use std::fs;
use std::path::PathBuf;

const YTDLP_URL: &str = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

/// Returns the path to yt-dlp.exe, checking bundled resources first, then
/// the app data directory, and finally downloading it if not found.
async fn ensure_ytdlp(app: &AppHandle) -> Result<PathBuf, String> {
    // 1. Check Tauri resource bundle first (for standalone distribution)
    let resource_path = app
        .path()
        .resource_dir()
        .ok()
        .map(|d| d.join("bin").join("yt-dlp.exe"));
    if let Some(ref path) = resource_path {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    // 2. Check app data directory (already downloaded previously)
    let bin_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No app data dir: {}", e))?
        .join("bin");

    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }

    let exe_path = bin_dir.join("yt-dlp.exe");
    if exe_path.exists() {
        return Ok(exe_path);
    }

    // 3. Download yt-dlp.exe as a last resort
    let response = reqwest::get(YTDLP_URL)
        .await
        .map_err(|e| format!("Failed to download yt-dlp: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("yt-dlp download returned HTTP {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read yt-dlp bytes: {}", e))?;

    fs::write(&exe_path, &bytes).map_err(|e| format!("Failed to write yt-dlp.exe: {}", e))?;
    Ok(exe_path)
}

#[command]
pub async fn download_youtube(app: AppHandle, url: String) -> Result<String, String> {
    // 1. Make sure yt-dlp.exe exists
    let ytdlp = ensure_ytdlp(&app).await?;

    // 2. Determine output directory
    let download_dir = app
        .path()
        .download_dir()
        .map_err(|_| "Could not find download dir".to_string())?
        .join("LuminaDownloads");

    if !download_dir.exists() {
        fs::create_dir_all(&download_dir).map_err(|e| e.to_string())?;
    }

    // 3. Build the output template — yt-dlp will fill in title
    let output_template = download_dir
        .join("%(title)s.%(ext)s")
        .to_string_lossy()
        .to_string();

    // 4. Run yt-dlp (async, non-blocking): extract audio, convert to m4a
    let output = tokio::process::Command::new(&ytdlp)
        .args([
            "-x",                        // extract audio
            "--audio-format", "m4a",     // output as m4a
            "--audio-quality", "0",      // best quality
            "-o", &output_template,      // output path
            "--no-playlist",             // single video only
            "--print", "after_move:filepath",  // print final path
            &url,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Check if ffmpeg is missing (needed for audio conversion)
        if stderr.contains("ffmpeg") || stderr.contains("ffprobe") {
            return Err("yt-dlp requires ffmpeg to convert audio. Please install ffmpeg (https://ffmpeg.org) and make sure it's in your system PATH, then try again.".to_string());
        }

        return Err(format!("yt-dlp failed: {}{}", stderr, stdout));
    }

    let filepath = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // If ffmpeg isn't available, yt-dlp may have downloaded as webm/m4a without converting.
    // Find the actual file that was downloaded.
    let actual_path = if !filepath.is_empty() && std::path::Path::new(&filepath).exists() {
        filepath
    } else {
        // Fallback: find the newest file in the download dir
        let mut newest: Option<(std::time::SystemTime, PathBuf)> = None;
        if let Ok(entries) = fs::read_dir(&download_dir) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        let modified = meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                        if newest.as_ref().map_or(true, |(t, _)| modified > *t) {
                            newest = Some((modified, entry.path()));
                        }
                    }
                }
            }
        }
        newest
            .map(|(_, p)| p.to_string_lossy().to_string())
            .ok_or_else(|| "Download completed but could not find the output file.".to_string())?
    };

    // 5. Scan the downloads directory into the library
    crate::library::scanner::scan_directory(&app, &download_dir.to_string_lossy().to_string())
        .map_err(|e| e.to_string())?;

    Ok(actual_path)
}
