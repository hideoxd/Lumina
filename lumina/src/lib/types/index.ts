/* ============================================================
   Lumina — Core Type Definitions
   ============================================================ */

/** Represents a single audio track in the library */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  disc_number: number | null;
  duration: number; // seconds
  file_path: string;
  file_format: string;
  file_size: number; // bytes
  bitrate: number | null;
  sample_rate: number | null;
  artwork_path: string | null;
  date_added: string; // ISO date
  last_played: string | null;
  play_count: number;
  favorite: boolean;
}

/** Represents an album */
export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  artwork_path: string | null;
  track_count: number;
  total_duration: number;
  genre: string;
}

/** Represents an artist */
export interface Artist {
  id: string;
  name: string;
  album_count: number;
  track_count: number;
  artwork_path: string | null;
}

/** Represents a playlist */
export interface Playlist {
  id: string;
  name: string;
  description: string;
  artwork_path: string | null;
  track_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
  is_smart: boolean;
  smart_rules: SmartPlaylistRule[] | null;
}

/** Smart playlist rule */
export interface SmartPlaylistRule {
  field: 'artist' | 'album' | 'genre' | 'year' | 'play_count' | 'date_added' | 'last_played' | 'favorite';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is' | 'is_not';
  value: string;
}

/** Playback repeat mode */
export type RepeatMode = 'off' | 'one' | 'all';

/** Library view mode */
export type ViewMode = 'tracks' | 'albums' | 'artists' | 'playlists' | 'favorites' | 'recent';

/** Library sort field */
export type SortField = 'title' | 'artist' | 'album' | 'year' | 'duration' | 'date_added' | 'play_count';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Navigation item in sidebar */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  view: ViewMode;
  badge?: number;
}

/** Theme preset */
export interface ThemePreset {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;
  glassBlur: number;
  glassOpacity: number;
  noiseOpacity: number;
  animationSpeed: number;
  borderRadius: number;
}

/** Audio visualizer data (FFT) */
export interface VisualizerData {
  frequencies: number[];
  waveform: number[];
  peak: number;
}

/** Player state */
export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;
  position: number; // current position in seconds
  duration: number;
  volume: number; // 0-1
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // seconds
}

/** Queue state */
export interface QueueState {
  tracks: Track[];
  currentIndex: number;
  history: Track[];
}

/** Scan progress event */
export interface ScanProgress {
  total: number;
  scanned: number;
  current_file: string;
  phase: 'scanning' | 'reading_metadata' | 'saving' | 'complete';
}
