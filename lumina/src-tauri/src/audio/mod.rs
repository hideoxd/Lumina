pub mod engine;

use tauri::{command, State};
use std::sync::Mutex;
use crate::audio::engine::AudioEngine;

pub struct AudioState {
    pub engine: Mutex<AudioEngine>,
}

#[command]
pub fn play_file(state: State<'_, AudioState>, path: String) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.play_file(&path)
}

#[command]
pub fn play_file_at(state: State<'_, AudioState>, path: String, position: f64) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.play_file_at(&path, position)
}

#[command]
pub fn pause_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.pause();
    Ok(())
}

#[command]
pub fn resume_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.resume();
    Ok(())
}

#[command]
pub fn stop_audio(state: State<'_, AudioState>) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.stop();
    Ok(())
}

#[command]
pub fn set_volume(state: State<'_, AudioState>, volume: f32) -> Result<(), String> {
    let mut engine = state.engine.lock().map_err(|_| "Lock error")?;
    engine.set_volume(volume);
    Ok(())
}
