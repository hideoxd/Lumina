/* ============================================================
   Lumina — sql.js Database Initialisation & Persistence
   ============================================================ */

import initSqlJs, { type Database } from 'sql.js';

const DB_STORAGE_KEY = 'lumina_db';

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

/* ── Schema ───────────────────────────────────────────────── */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  album_artist TEXT,
  genre TEXT,
  year INTEGER,
  track_number INTEGER,
  disc_number INTEGER,
  duration REAL NOT NULL,
  file_path TEXT UNIQUE NOT NULL,
  file_format TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  bitrate INTEGER,
  sample_rate INTEGER,
  composer TEXT,
  publisher TEXT,
  comments TEXT,
  artwork_path TEXT,
  date_added TEXT NOT NULL,
  last_played TEXT,
  play_count INTEGER DEFAULT 0,
  favorite BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  artwork_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_smart BOOLEAN NOT NULL DEFAULT 0,
  smart_rules TEXT
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS playlist_tracks_by_playlist
  ON playlist_tracks(playlist_id, position);
`;

/* ── Persistence helpers ──────────────────────────────────── */

function loadFromStorage(): Uint8Array | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return null;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    console.warn('[lumina-db] Failed to load database from localStorage, starting fresh');
    // Clear corrupted data so it doesn't keep failing
    try { localStorage.removeItem(DB_STORAGE_KEY); } catch { /* ignore */ }
    return null;
  }
}

function persistToStorage(database: Database): void {
  try {
    const data = database.export();
    const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
    localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
  } catch {
    console.warn('[lumina-db] Failed to persist database to localStorage');
  }
}

/* ── Initialisation ───────────────────────────────────────── */

async function initDb(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });

  let instance: Database;

  // Try loading saved database; if it's corrupt, start fresh
  const saved = loadFromStorage();
  if (saved) {
    try {
      instance = new SQL.Database(saved);
      // Verify the database is actually functional
      instance.exec('SELECT 1');
    } catch (e) {
      console.warn('[lumina-db] Saved database was corrupted, creating fresh database:', e);
      try { localStorage.removeItem(DB_STORAGE_KEY); } catch { /* ignore */ }
      instance = new SQL.Database();
    }
  } else {
    instance = new SQL.Database();
  }

  // Ensure schema exists (safe to run on every start)
  instance.run(SCHEMA);

  db = instance;
  return instance;
}

/**
 * Returns the singleton sql.js Database instance.
 * Initialises on first call; subsequent calls return the cached promise.
 * If initialization fails, the promise is reset so it can be retried.
 */
export async function getDb(): Promise<Database> {
  if (db) return db;
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      // Reset the promise so future calls can retry instead of
      // permanently returning a rejected promise
      console.error('[lumina-db] Database initialization failed:', err);
      initPromise = null;
      db = null;
      throw err;
    });
  }
  return initPromise;
}

/**
 * Persist the current database state to localStorage.
 * Call after every write operation.
 */
export async function saveDb(): Promise<void> {
  const database = await getDb();
  persistToStorage(database);
}
