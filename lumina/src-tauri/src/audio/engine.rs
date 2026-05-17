use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player, Source};
use std::fs::File;
use std::time::Duration;

pub struct AudioEngine {
    // The playback will stop if the device sink is dropped.
    _device_sink: MixerDeviceSink,
    player: Player,
    volume: f32,
}

impl AudioEngine {
    pub fn new() -> Result<Self, String> {
        let device_sink = DeviceSinkBuilder::open_default_sink()
            .map_err(|e| format!("Failed to open default audio device: {e}"))?;

        let player = Player::connect_new(&device_sink.mixer());
        let volume = 0.8;
        player.set_volume(volume);

        Ok(Self {
            _device_sink: device_sink,
            player,
            volume,
        })
    }

    pub fn play_file(&mut self, path: &str) -> Result<(), String> {
        self.play_file_at(path, 0.0)
    }

    pub fn play_file_at(&mut self, path: &str, position_secs: f64) -> Result<(), String> {
        let file = File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;

        let source = Decoder::try_from(file)
            .map_err(|e| format!("Failed to decode audio: {e}"))?
            .skip_duration(Duration::from_secs_f64(position_secs.max(0.0)));

        // Stop current playback, clear the queue, and start fresh.
        self.player.stop();
        self.player.set_volume(self.volume);
        self.player.append(source);
        self.player.play();
        Ok(())
    }

    pub fn pause(&mut self) {
        self.player.pause();
    }

    pub fn resume(&mut self) {
        self.player.play();
    }

    pub fn stop(&mut self) {
        self.player.stop();
    }

    pub fn set_volume(&mut self, volume: f32) {
        self.volume = volume;
        self.player.set_volume(volume);
    }
}
