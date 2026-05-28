/* ============================================================
   Lumina — Lyrics Store
   Fetches, caches, and synchronizes lyrics with playback
   Uses LRCLIB (free, no API key required)
   ============================================================ */
import { writable, derived } from 'svelte/store';
import { playerState } from '$lib/stores/player';
import type { Track } from '$lib/types';
/* ── Types ── */

export interface LyricLine {
  time: number;  // seconds
  text: string;
}

export interface LyricsData {
  trackId: string;
  title: string;
  artist: string;
  synced: LyricLine[];
  plain: string | null;
  source: 'lrclib' | 'plain' | 'none';
}

/* ── Store ── */

export const lyricsStore = writable<LyricsData | null>(null);
export const lyricsLoading = writable(false);
export const lyricsError = writable<string | null>(null);

/** Current active lyric line index (-1 when none) */
export const currentLine = derived(
  [playerState, lyricsStore],
  ([$ps, $ls]) => {
    if (!$ls || $ls.synced.length === 0) return -1;
    const pos = $ps.position;
    const lines = $ls.synced;
    // Find the last line whose timestamp ≤ current position
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time <= pos) return i;
    }
    return -1;
  }
);

/* ── Cache ── */

const CACHE_PREFIX = 'lumina.lyrics.v1.';

function cacheKey(track: Track): string {
  return CACHE_PREFIX + `${track.artist}|${track.title}`.toLowerCase().replace(/[^a-z0-9|]/g, '_');
}

function loadFromCache(track: Track): LyricsData | null {
  try {
    const raw = localStorage.getItem(cacheKey(track));
    if (!raw) return null;
    const data = JSON.parse(raw) as LyricsData;
    // Validate cache belongs to this exact track
    if (data.trackId === track.id) return data;
    return null;
  } catch {
    return null;
  }
}

function saveToCache(data: LyricsData): void {
  try {
    localStorage.setItem(cacheKey({ id: data.trackId, artist: data.artist, title: data.title } as Track), JSON.stringify(data));
  } catch {
    // cache full or unavailable – silently ignore
  }
}

/* ── LRC Parser ── */

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lrc)) !== null) {
    const mins = parseInt(match[1], 10);
    const secs = parseFloat(match[2]);
    const text = match[3].trim();
    if (text) {
      lines.push({ time: mins * 60 + secs, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

/* ── Devanagari → Hindi Roman transliteration ──
 *
 * Two-phase character-by-character parser that converts Hindi text
 * (Devanagari script) to readable romanized form.
 *
 * Phase 1 — Parse with inherent 'a' (Sanskrit-style):
 *   Consonant + halant → consonant alone (conjunct, no 'a')
 *   Consonant + vowel sign → consonant + vowel
 *   Consonant + consonant (no halant) → consonant + inherent 'a'
 *   Consonant at word/string end → consonant alone (Hindi schwa syncope)
 *
 * Phase 2 — Hindi schwa syncope:
 *   Delete 'a' at word-final boundaries
 *   Delete 'a' in CaCV patterns (e.g., karataa → kartaa)
 *
 * Vowel signs attach to preceding consonants, anusvara → 'n'.
 */

// Devanagari block: U+0900–U+097F, with nuqta extension U+0958–U+095F
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const CONSONANT_RE = /[\u0915-\u0939\u0958-\u095F]/;  // क to ह + nuqta

function hasDevanagari(text: string): boolean {
  return DEVANAGARI_RE.test(text);
}

// ── Character mappings ──

const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l',
  // Nuqta chars (U+0958–U+095F)
  'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z',
  'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y',
};

const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ऋ': 'ri', 'ॠ': 'ri',
};

const VOWEL_SIGNS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'ॄ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

/* ── Core transliteration ── */

function transliterateText(text: string): string {
  const out: string[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    // Non-Devanagari passes through unchanged
    if (code < 0x0900 || code > 0x097F) {
      out.push(ch);
      i++;
      continue;
    }

    // ── Consonant (क to ह + nuqta) ──
    if ((code >= 0x0915 && code <= 0x0939) || (code >= 0x0958 && code <= 0x095F)) {
      const base = CONSONANTS[ch] ?? '?';
      const next = i + 1 < text.length ? text[i + 1] : '';

      if (next === '्') {
        // Halant → consonant alone (part of conjunct), skip the halant char
        out.push(base);
        i += 2;
      } else if (next && VOWEL_SIGNS[next] !== undefined) {
        // Consonant + vowel sign replaces inherent 'a'
        out.push(base + VOWEL_SIGNS[next]);
        i += 2;
      } else if (next && CONSONANT_RE.test(next)) {
        // Consonant followed by another consonant (no halant)
        // → inherent 'a' is present in well-formed Devanagari
        out.push(base + 'a');
        i++;
      } else {
        // Bare consonant at word/string end (Hindi schwa syncope)
        out.push(base);
        i++;
      }
      continue;
    }

    // ── Independent vowel ──
    if (code >= 0x0905 && code <= 0x0914) {
      out.push(VOWELS[ch] ?? ch);
      i++;
      continue;
    }

    // ── Vowel sign without preceding consonant (shouldn't happen, but be safe) ──
    if (VOWEL_SIGNS[ch] !== undefined) {
      out.push(VOWEL_SIGNS[ch]);
      i++;
      continue;
    }

    // ── Anusvara (ं) U+0902 ──
    if (ch === 'ं') {
      const prev = i > 0 ? text[i - 1] : '';
      if (prev === '\u0947' || prev === '\u090F') {
        // 'e' (े) + anusvara → 'ein' (e.g., बातें → baatein)
        const last = out.pop() ?? '';
        out.push(last.endsWith('e') ? last.slice(0, -1) + 'ein' : last + 'n');
      } else {
        out.push('n');
      }
      i++;
      continue;
    }

    // ── Chandrabindu (ँ) U+0901 ──
    if (ch === 'ँ') {
      const prev = i > 0 ? text[i - 1] : '';
      if (prev === '\u0947' || prev === '\u090F') {
        // 'e' (े) + chandrabindu → 'ein'
        const last = out.pop() ?? '';
        out.push(last.endsWith('e') ? last.slice(0, -1) + 'ein' : last + 'n');
      } else {
        out.push('n');
      }
      i++;
      continue;
    }

    // ── Nukta (़) U+093C — combining dot below ──
    if (ch === '़') {
      const last = out.pop() ?? '';
      const map: Record<string, string> = {
        'k': 'q', 'kh': 'kh', 'g': 'g', 'j': 'z', 'ph': 'f',
        'd': 'r', 'dh': 'rh', 'y': 'y',
      };
      out.push(map[last] ?? last);
      i++;
      continue;
    }

    // ── Visarga (ः) U+0903 ──
    if (ch === 'ः') {
      out.push('h');
      i++;
      continue;
    }

    // ── Halant (्) U+094D ──
    if (ch === '्') {
      i++;
      continue;
    }

    // ── Avagraha (ऽ) U+093D ──
    if (ch === 'ऽ') {
      out.push("'");
      i++;
      continue;
    }

    // ── Om (ॐ) U+0950 ──
    if (ch === 'ॐ') {
      out.push('om');
      i++;
      continue;
    }

    // ── Digits ०-९ U+0966-U+096F ──
    if (code >= 0x0966 && code <= 0x096F) {
      out.push(String(code - 0x0966));
      i++;
      continue;
    }

    // ── Danda (।) U+0964, Double danda (॥) U+0965 ──
    if (ch === '।') { out.push('.'); i++; continue; }
    if (ch === '॥') { out.push('.'); i++; continue; }

    // Fallback: pass through
    out.push(ch);
    i++;
  }

  let result = out.join('');

  // Phase 2: Hindi schwa syncope — delete inherent 'a' at word boundaries
  // (Hindi word-final schwa is silent, e.g., hama → ham, raama → raam)
  result = result.replace(/([bcdfghjklmnpqrstvwxyz])a(?=[\s,.\!?;:)\]'"\u0964\u0965]|$)/g, '$1');

  // Special conjunct: ज्ञ (j + halant + ny = jny) → gy
  // This is the standard Hindi romanization for ज्ञान → gyaan, अज्ञ → agya
  result = result.replace(/jny/g, 'gy');

  return result;
}

/** If any lyric text contains Devanagari script, transliterate to romanized Hindi. */
function applyTransliteration(data: LyricsData): LyricsData {
  const needsTransliteration = data.synced.some((l) => hasDevanagari(l.text))
    || (data.plain !== null && hasDevanagari(data.plain));

  if (!needsTransliteration) return data;

  return {
    ...data,
    synced: data.synced.map((l) => ({ ...l, text: transliterateText(l.text) })),
    plain: data.plain !== null
      ? data.plain.split('\n').map((line) => {
          const t = line.trim();
          return t ? transliterateText(t) : '';
        }).join('\n')
      : null,
  };
}

/* ── LRCLIB API ── */

const LRCLIB_BASE = 'https://lrclib.net/api';

interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics: string;
  syncedLyrics: string;
}

async function fetchFromLrclib(artist: string, title: string, duration: number): Promise<LyricsData | null> {
  // Omit custom headers to avoid CORS preflight (OPTIONS) in browser mode.
  // Simple GET requests with no custom headers don't trigger preflight.
  const url = `${LRCLIB_BASE}/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (res.ok) {
    const data: LrclibResponse = await res.json();
    return convertLrclibResponse(data);
  }

  // If 404, try `search` as fallback
  if (res.status === 404) {
    const searchUrl = `${LRCLIB_BASE}/search?q=${encodeURIComponent(`${artist} ${title}`)}`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (searchRes.ok) {
      const results: LrclibResponse[] = await searchRes.json();
      // Find best match: same artist + title, close duration (if known)
      const hasValidDuration = duration > 0;
      const best = results.find(
        (r) =>
          r.artistName.toLowerCase() === artist.toLowerCase() &&
          r.trackName.toLowerCase() === title.toLowerCase() &&
          (!hasValidDuration || Math.abs(r.duration - duration) < 3)
      ) ?? (results.length > 0 ? results[0] : null);
      if (best) return convertLrclibResponse(best);
    }
  }

  return null;
}

function convertLrclibResponse(data: LrclibResponse): LyricsData {
  const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
  return {
    trackId: '',
    title: data.trackName,
    artist: data.artistName,
    synced,
    plain: data.plainLyrics || null,
    source: synced.length > 0 ? 'lrclib' : data.plainLyrics ? 'plain' : 'none',
  };
}

/* ── Public API ── */

export async function fetchLyrics(track: Track): Promise<void> {
  lyricsLoading.set(true);
  lyricsError.set(null);

  // Check cache first
  const cached = loadFromCache(track);
  if (cached) {
    lyricsStore.set(applyTransliteration(cached));
    lyricsLoading.set(false);
    return;
  }

  try {
    const result = await fetchFromLrclib(track.artist, track.title, track.duration);
    if (result) {
      result.trackId = track.id;
      const transliterated = applyTransliteration(result);
      saveToCache(transliterated);
      lyricsStore.set(transliterated);
    } else {
      // Store a "not found" marker so we don't retry
      const notFound: LyricsData = {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        synced: [],
        plain: null,
        source: 'none',
      };
      saveToCache(notFound);
      lyricsStore.set(notFound);
    }
  } catch (e) {
    let msg: string;
    if (e instanceof DOMException && e.name === 'AbortError') {
      msg = 'Lyrics request timed out. Please try again.';
    } else if (e instanceof TypeError && e.message === 'Failed to fetch') {
      msg = 'Network error - check your connection.';
    } else {
      msg = e instanceof Error ? e.message : 'Failed to fetch lyrics';
    }
    lyricsError.set(msg);
    lyricsStore.set(null);
  } finally {
    lyricsLoading.set(false);
  }
}

/** Clear cached lyrics for re-fetch */
export function clearLyricsCache(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
