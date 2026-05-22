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

  // YouTube state
  private ytPlayer: any = null;
  private isYtReady = false;
  private ytInitPromise: Promise<void> | null = null;
  private activeEngine: 'audio' | 'youtube' | null = null;
  private ytPollInterval: any = null;
  private lastYtVolume = 1.0;

  /* ── Event callbacks ────────────────────────────────────── */
  onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  onEnded: (() => void) | null = null;
  onError: ((error: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.setupAudioListeners();
  }

  private setupAudioListeners(): void {
    this.audio.addEventListener('timeupdate', () => {
      if (this.activeEngine === 'audio') {
        this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.activeEngine === 'audio') {
        this.onEnded?.();
      }
    });

    this.audio.addEventListener('error', () => {
      if (this.activeEngine !== 'audio') return;
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

  /* ── YouTube Loader ───────────────────────────────────────── */

  private async ensureYtPlayerReady(): Promise<void> {
    if (this.isYtReady) return;
    if (this.ytInitPromise) return this.ytInitPromise;

    this.ytInitPromise = new Promise<void>((resolve) => {
      // Append hidden container for the YT iframe
      if (!document.getElementById('youtube-player-container')) {
        const container = document.createElement('div');
        container.id = 'youtube-player-container';
        container.style.position = 'fixed';
        container.style.left = '-1000px';
        container.style.top = '-1000px';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }

      // Load YouTube Iframe API
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        const previousCallback = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (previousCallback) previousCallback();
          this.initYtPlayer(resolve);
        };
      } else {
        this.initYtPlayer(resolve);
      }
    });

    return this.ytInitPromise;
  }

  private initYtPlayer(resolve: () => void): void {
    this.ytPlayer = new (window as any).YT.Player('youtube-player-container', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: () => {
          this.isYtReady = true;
          this.ytPlayer.setVolume(this.lastYtVolume * 100);
          resolve();
        },
        onStateChange: (event: any) => this.handleYtStateChange(event),
        onError: (err: any) => this.handleYtError(err),
      },
    });
  }

  private handleYtStateChange(event: any): void {
    if (this.activeEngine !== 'youtube') return;

    const YT = (window as any).YT;
    if (!YT) return;

    if (event.data === YT.PlayerState.PLAYING) {
      this.startYtPolling();
    } else {
      this.stopYtPolling();
    }

    if (event.data === YT.PlayerState.ENDED) {
      this.onEnded?.();
    }
  }

  private handleYtError(event: any): void {
    if (this.activeEngine !== 'youtube') return;
    this.onError?.('YouTube playback error code: ' + event.data);
  }

  private startYtPolling(): void {
    this.stopYtPolling();
    this.ytPollInterval = setInterval(() => {
      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const current = this.ytPlayer.getCurrentTime();
        const duration = this.ytPlayer.getDuration() || 0;
        this.onTimeUpdate?.(current, duration);
      }
    }, 250);
  }

  private stopYtPolling(): void {
    if (this.ytPollInterval) {
      clearInterval(this.ytPollInterval);
      this.ytPollInterval = null;
    }
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
    if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('youtube:')) {
      const videoId = fileOrUrl.replace('youtube:', '');
      this.activeEngine = 'youtube';
      this.audio.pause();
      this.revokeOldUrl();

      this.ensureYtPlayerReady()
        .then(() => {
          if (this.activeEngine === 'youtube') {
            this.ytPlayer.loadVideoById(videoId);
            this.ytPlayer.playVideo();
          }
        })
        .catch((err) => this.onError?.(String(err)));
    } else {
      this.activeEngine = 'audio';
      this.stopYtPolling();
      if (this.ytPlayer && this.isYtReady) {
        try {
          this.ytPlayer.stopVideo();
        } catch {
          // ignore if player is in weird state
        }
      }
      this.audio.src = this.resolveSource(fileOrUrl);
      this.audio.play().catch((err) => this.onError?.(String(err)));
    }
  }

  /** Load a File or URL and seek to `positionSeconds` before playing. */
  playFileAt(fileOrUrl: File | string, positionSeconds: number): void {
    if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('youtube:')) {
      const videoId = fileOrUrl.replace('youtube:', '');
      this.activeEngine = 'youtube';
      this.audio.pause();
      this.revokeOldUrl();

      this.ensureYtPlayerReady()
        .then(() => {
          if (this.activeEngine === 'youtube') {
            this.ytPlayer.loadVideoById({
              videoId: videoId,
              startSeconds: positionSeconds,
            });
            this.ytPlayer.playVideo();
          }
        })
        .catch((err) => this.onError?.(String(err)));
    } else {
      this.activeEngine = 'audio';
      this.stopYtPolling();
      if (this.ytPlayer && this.isYtReady) {
        try {
          this.ytPlayer.stopVideo();
        } catch {
          // ignore
        }
      }

      this.audio.src = this.resolveSource(fileOrUrl);

      const onReady = () => {
        this.audio.removeEventListener('loadedmetadata', onReady);
        this.audio.currentTime = positionSeconds;
        this.audio.play().catch((err) => this.onError?.(String(err)));
      };
      this.audio.addEventListener('loadedmetadata', onReady);
    }
  }

  /** Pause playback (retaining position). */
  pause(): void {
    if (this.activeEngine === 'youtube') {
      if (this.ytPlayer && this.isYtReady) {
        try {
          this.ytPlayer.pauseVideo();
        } catch {
          // ignore
        }
      }
    } else {
      this.audio.pause();
    }
  }

  /** Resume from current position. */
  resume(): void {
    if (this.activeEngine === 'youtube') {
      if (this.ytPlayer && this.isYtReady) {
        try {
          this.ytPlayer.playVideo();
        } catch {
          // ignore
        }
      }
    } else {
      this.audio.play().catch((err) => this.onError?.(String(err)));
    }
  }

  /** Stop playback and reset position to 0. */
  stop(): void {
    this.stopYtPolling();
    if (this.ytPlayer && this.isYtReady) {
      try {
        this.ytPlayer.stopVideo();
      } catch {
        // ignore
      }
    }
    this.audio.pause();
    this.audio.currentTime = 0;
    this.activeEngine = null;
  }

  /** Set volume (clamped to 0 – 1). */
  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.lastYtVolume = clamped;
    this.audio.volume = clamped;
    if (this.ytPlayer && this.isYtReady) {
      try {
        this.ytPlayer.setVolume(clamped * 100);
      } catch {
        // ignore
      }
    }
  }

  /** Current playback position in seconds. */
  getCurrentTime(): number {
    if (this.activeEngine === 'youtube') {
      return this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function'
        ? this.ytPlayer.getCurrentTime()
        : 0;
    }
    return this.audio.currentTime;
  }

  /** Total duration of the loaded media in seconds. */
  getDuration(): number {
    if (this.activeEngine === 'youtube') {
      return this.ytPlayer && typeof this.ytPlayer.getDuration === 'function'
        ? this.ytPlayer.getDuration()
        : 0;
    }
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
