/* ============================================================
   Lumina — Music File Scanner
   Uses the File System Access API to scan directories and
   jsmediatags to extract audio metadata in the browser.
   ============================================================ */

import jsmediatags from 'jsmediatags';
import type { TagType, PictureType } from 'jsmediatags/types';

/* ── Constants ────────────────────────────────────────────── */

const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  'mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'aiff', 'wma', 'opus', 'webm',
]);

/* ── Types ────────────────────────────────────────────────── */

export interface ScannedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  disc_number: number | null;
  duration: number;
  file_path: string;
  file_format: string;
  file_size: number;
  bitrate: number | null;
  sample_rate: number | null;
  composer: string | null;
  publisher: string | null;
  comments: string | null;
  artwork_data: string | null; // base64 data-URL
  date_added: string;
  last_played: string | null;
  play_count: number;
  favorite: boolean;
}

/* ── Shared state ─────────────────────────────────────────── */

/** Maps a file-name "path" → its FileSystemFileHandle so we can play it later. */
export const fileHandleStore = new Map<string, FileSystemFileHandle>();

/** The most-recently opened directory handle (useful for persistence). */
export let lastDirectoryHandle: FileSystemDirectoryHandle | null = null;

/* ── Utilities ────────────────────────────────────────────── */

/** Deterministic-ish ID from a string (no external uuid dep). */
function generateId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + Date.now().toString(36);
}

/** Get the extension from a filename (lowercase, no dot). */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Use a temporary Audio element to obtain duration in seconds. */
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration || 0);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', () => {
      resolve(0);
      URL.revokeObjectURL(url);
    });
    audio.src = url;
  });
}

/** Extract tags from a File via jsmediatags (promisified). */
function readTags(file: File): Promise<TagType | null> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag: TagType) => resolve(tag),
      onError: () => resolve(null),
    });
  });
}

/** Convert jsmediatags picture data to a base64 data-URL. */
function pictureToDataUrl(
  picture: PictureType | undefined,
): string | null {
  if (!picture || !picture.data || picture.data.length === 0) return null;

  const bytes = new Uint8Array(picture.data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mime = picture.format || 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

/** Parse a numeric-ish tag value (e.g. "3" or "3/12"). */
function parseNumericTag(value: unknown): number | null {
  if (value == null) return null;
  const str = String(value).split('/')[0].trim();
  const num = parseInt(str, 10);
  return Number.isFinite(num) ? num : null;
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Open the native directory picker and return the handle.
 * Returns `null` if the user cancels.
 */
export async function pickMusicFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    lastDirectoryHandle = handle;
    return handle;
  } catch {
    // User cancelled or API unavailable
    return null;
  }
}

/**
 * Recursively walk a directory handle, find audio files,
 * extract metadata, and return an array of ScannedTrack objects.
 */
export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (scanned: number, total: number) => void,
): Promise<ScannedTrack[]> {
  // Phase 1 — collect all audio file entries
  const entries: { handle: FileSystemFileHandle; path: string }[] = [];

  async function walk(
    handle: FileSystemDirectoryHandle,
    pathPrefix: string,
  ): Promise<void> {
    for await (const entry of handle.values()) {
      if (entry.kind === 'directory') {
        await walk(entry, pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name);
      } else if (entry.kind === 'file' && AUDIO_EXTENSIONS.has(extensionOf(entry.name))) {
        const filePath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
        entries.push({ handle: entry, path: filePath });
      }
    }
  }

  await walk(dirHandle, '');

  const total = entries.length;
  const tracks: ScannedTrack[] = [];
  const now = new Date().toISOString();

  // Phase 2 — read metadata for every discovered file
  for (let i = 0; i < entries.length; i++) {
    const { handle, path } = entries[i];
    onProgress?.(i + 1, total);

    try {
      const file = await handle.getFile();
      const ext = extensionOf(file.name);

      // Store handle for future playback
      fileHandleStore.set(path, handle);

      // Read ID3/Vorbis/etc. tags
      const tag = await readTags(file);
      const tags = tag?.tags as Record<string, unknown> | undefined;

      // Duration via temporary <audio>
      const duration = await getAudioDuration(file);

      const title =
        (tags?.title as string | undefined)?.trim() ||
        file.name.replace(/\.[^.]+$/, '');

      tracks.push({
        id: generateId(path),
        title,
        artist: ((tags?.artist as string) ?? 'Unknown Artist').trim(),
        album: ((tags?.album as string) ?? 'Unknown Album').trim(),
        album_artist: (tags?.albumartist as string | undefined)?.trim() ?? null,
        genre: (tags?.genre as string | undefined)?.trim() ?? null,
        year: parseNumericTag(tags?.year),
        track_number: parseNumericTag(tags?.track),
        disc_number: parseNumericTag(tags?.disc),
        duration,
        file_path: path,
        file_format: ext,
        file_size: file.size,
        bitrate: null, // jsmediatags doesn't reliably expose this
        sample_rate: null,
        composer: (tags?.composer as string | undefined)?.trim() ?? null,
        publisher: (tags?.publisher as string | undefined)?.trim() ?? null,
        comments:
          (tags?.comment as { text?: string } | undefined)?.text?.trim() ?? null,
        artwork_data: pictureToDataUrl(
          tags?.picture as PictureType | undefined,
        ),
        date_added: now,
        last_played: null,
        play_count: 0,
        favorite: false,
      });
    } catch {
      // Skip files we can't read (permission errors, corrupt data, etc.)
    }
  }

  return tracks;
}

/**
 * Get a playable object-URL for a track.
 *
 * Callers are responsible for revoking the URL when it is no longer
 * needed (the audio engine handles this automatically).
 */
export async function getFileUrlForTrack(filePath: string): Promise<string> {
  const handle = fileHandleStore.get(filePath);
  if (!handle) {
    throw new Error(`No file handle stored for "${filePath}"`);
  }
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}
