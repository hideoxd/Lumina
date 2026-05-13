use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct AudioEngine {
    _stream: OutputStream,
    stream_handle: OutputStreamHandle,
    pub sink: Arc<Mutex<Sink>>,
    volume: f32,
}

impl AudioEngine {
    pub fn new() -> Result<Self, String> {
        let (stream, stream_handle) = OutputStream::try_default()
            .map_err(|e| format!("Failed to get output stream: {}", e))?;
        
        let sink = Sink::try_new(&stream_handle)
            .map_err(|e| format!("Failed to create sink: {}", e))?;

        let volume = 0.8;
        sink.set_volume(volume);

        Ok(Self {
            _stream: stream,
            stream_handle,
            sink: Arc::new(Mutex::new(sink)),
            volume,
        })
    }

    pub fn play_file(&mut self, path: &str) -> Result<(), String> {
        self.play_file_at(path, 0.0)
    }

    pub fn play_file_at(&mut self, path: &str, position_secs: f64) -> Result<(), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let reader = BufReader::new(file);

        let source = Decoder::new(reader)
            .map_err(|e| format!("Failed to decode audio: {}", e))?
            .skip_duration(Duration::from_secs_f64(position_secs.max(0.0)));

        // Stop current playing and swap sink for a clean state.
        self.sink.lock().unwrap().stop();

        let new_sink = Sink::try_new(&self.stream_handle)
            .map_err(|e| format!("Failed to create new sink: {}", e))?;
        new_sink.set_volume(self.volume);
        new_sink.append(source);
        new_sink.play();

        *self.sink.lock().unwrap() = new_sink;
        Ok(())
    }

    pub fn pause(&mut self) {
        self.sink.lock().unwrap().pause();
    }

    pub fn resume(&mut self) {
        self.sink.lock().unwrap().play();
    }

    pub fn stop(&mut self) {
        self.sink.lock().unwrap().stop();
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume;
        self.sink.lock().unwrap().set_volume(volume);
    }
}
