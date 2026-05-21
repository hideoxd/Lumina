/* ============================================================
   Lumina — Browser Audio Engine
   Wraps the HTML5 <audio> element for in-browser playback.
   ============================================================ */

/**
 * Thin wrapper around a single HTMLAudioElement that manages
 * object-URL lifecycle and exposes a callback-driven API.
 */
export class BrowserAudioEngine {
  private audio: HTMLAudioElement;
  private currentObjectUrl: string | null = null;

  /* ── Event callbacks ────────────────────────────────────── */
  onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  onEnded: (() => void) | null = null;
  onError: ((error: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();

    this.audio.addEventListener('timeupdate', () => {
      this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
    });

    this.audio.addEventListener('ended', () => {
      this.onEnded?.();
    });

    this.audio.addEventListener('error', () => {
      const code = this.audio.error?.code;
      const msg =
        code === MediaError.MEDIA_ERR_ABORTED
          ? 'Playback aborted'
          : code === MediaError.MEDIA_ERR_NETWORK
            ? 'Network error'
            : code === MediaError.MEDIA_ERR_DECODE
              ? 'Decode error'
              : code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                ? 'Format not supported'
                : 'Unknown playback error';
      this.onError?.(msg);
    });
  }

  /* ── Helpers ────────────────────────────────────────────── */

  /** Revoke the previous object URL (if any) to free memory. */
  private revokeOldUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  /** Resolve a File | string to a playable URL, managing object URLs. */
  private resolveSource(fileOrUrl: File | string): string {
    this.revokeOldUrl();

    if (fileOrUrl instanceof File) {
      const url = URL.createObjectURL(fileOrUrl);
      this.currentObjectUrl = url;
      return url;
    }

    // Raw URL / blob URL — nothing to manage
    return fileOrUrl;
  }

  /* ── Playback controls ──────────────────────────────────── */

  /** Load and immediately play a File or URL. */
  playFile(fileOrUrl: File | string): void {
    this.audio.src = this.resolveSource(fileOrUrl);
    this.audio.play().catch((err) => this.onError?.(String(err)));
  }

  /** Load a File or URL and seek to `positionSeconds` before playing. */
  playFileAt(fileOrUrl: File | string, positionSeconds: number): void {
    this.audio.src = this.resolveSource(fileOrUrl);

    const onReady = () => {
      this.audio.removeEventListener('loadedmetadata', onReady);
      this.audio.currentTime = positionSeconds;
      this.audio.play().catch((err) => this.onError?.(String(err)));
    };
    this.audio.addEventListener('loadedmetadata', onReady);
  }

  /** Pause playback (retaining position). */
  pause(): void {
    this.audio.pause();
  }

  /** Resume from current position. */
  resume(): void {
    this.audio.play().catch((err) => this.onError?.(String(err)));
  }

  /** Stop playback and reset position to 0. */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  /** Set volume (clamped to 0 – 1). */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /** Current playback position in seconds. */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /** Total duration of the loaded media in seconds. */
  getDuration(): number {
    return this.audio.duration || 0;
  }
}

/* ── Singleton access ─────────────────────────────────────── */

let instance: BrowserAudioEngine | null = null;

/** Return (or create) the singleton audio engine instance. */
export function getAudioEngine(): BrowserAudioEngine {
  if (!instance) {
    instance = new BrowserAudioEngine();
  }
  return instance;
}
