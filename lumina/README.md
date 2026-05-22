# Lumina

**A premium local music player** built with Tauri 2, Svelte 5, and Rust. Features a dark glass UI, local library management, YouTube search + download, and a compact mini player mode.

## Features

- **Local Music Library** — Import audio files (MP3, FLAC, M4A, OGG, WAV, etc.) from your computer
- **Library Management** — Browse by tracks, albums, artists, and playlists; search, favorite, and edit metadata
- **Playback** — Play/pause, skip, seek, shuffle, repeat modes, volume control, and queue management
- **YouTube Integration** — Search YouTube via the Data API v3 and download audio directly into your library (requires `yt-dlp` and `ffmpeg`)
- **Mini Player** — Compact always-on-top window mode that shrinks to the corner of your screen
- **Custom Titlebar** — Frameless window with custom minimize/maximize/close controls
- **Theme Engine** — 6 built-in presets (Aurora Blue, Crystal Sky, Deep Ocean, etc.) with adjustable accent color, glass blur, opacity, border radius, animation speed, and dark/light mode
- **Dual-mode** — Runs as a native Tauri desktop app **or** directly in a web browser (with reduced capabilities)

## Screenshots

<!-- Add screenshots here -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5, SvelteKit 2, TypeScript, Vite 6 |
| Desktop Shell | Tauri 2 |
| Backend (Tauri) | Rust with rodio (audio), rusqlite (database), lofty (metadata), yt-dlp (YouTube) |
| Database | SQLite (via rusqlite on desktop, sql.js via WebAssembly in browser) |
| Browser Mode | HTML5 Audio API, File System Access API, jsmediatags |
| Styling | CSS custom properties, Liquid Glass design system |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (for Tauri desktop builds)
- **Optional:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) (auto-downloaded by the app for YouTube downloads)
- **Optional:** [ffmpeg](https://ffmpeg.org/) (required for YouTube audio conversion)
- **Optional:** YouTube Data API v3 key (for YouTube search — [get one here](https://console.cloud.google.com/))

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server (browser mode)
pnpm dev

# Or run as a Tauri desktop app
pnpm tauri dev
```

The browser dev server runs at `http://localhost:1420`.

### Build for Production

```bash
# Build the Tauri desktop app
pnpm tauri build
```

## YouTube Setup (Optional)

1. Get a YouTube Data API v3 key from the [Google Cloud Console](https://console.cloud.google.com/)
2. Add it to `src/lib/config/api.ts`:
   ```ts
   export const YOUTUBE_API_KEY = "AIzaSy...";
   ```
3. Or set it later via the in-app Settings (gear icon in the titlebar)

## Project Structure

```
lumina/
├── src/                          # Frontend source (SvelteKit SPA)
│   ├── app.html                  # HTML shell
│   ├── app.css                   # Global CSS design system
│   ├── routes/
│   │   ├── +layout.svelte        # Root layout + splash screen
│   │   ├── +layout.ts
│   │   ├── +page.svelte          # Main page (all views + player)
│   │   └── +error.svelte
│   ├── lib/
│   │   ├── components/
│   │   │   ├── layout/           # Titlebar, Sidebar, PlayerBar
│   │   │   ├── library/          # TrackList, AlbumGrid, ArtistGrid, PlaylistGrid
│   │   │   ├── overlays/         # SettingsModal, NowPlaying, QueuePanel, EditMetadataModal
│   │   │   ├── ui/               # Button, Card, Modal, Slider, Toggle, ContextMenu
│   │   │   └── visualizer/       # WaveBars
│   │   ├── stores/               # Svelte stores (player, queue, library, ui, theme, api)
│   │   ├── commands/             # Tauri command wrappers
│   │   ├── controllers/          # Browser-mode controllers
│   │   ├── db/                   # SQLite database layer (sql.js)
│   │   ├── scanner/              # Browser file scanner (File System Access API)
│   │   ├── audio/                # Browser audio engine
│   │   ├── utils/                # Artwork, persist helpers
│   │   ├── types/                # TypeScript type definitions
│   │   └── config/               # API keys config
│   └── static/                   # Static assets (logo, favicon, wasm)
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # App setup, command registration
│   │   ├── audio/                # Audio playback engine (rodio)
│   │   ├── database/             # SQLite, migrations, queries
│   │   ├── library/              # Scanner, metadata, folder watcher
│   │   ├── youtube.rs            # YouTube download (yt-dlp)
│   │   └── utils/                # Artwork extraction
│   ├── tauri.conf.json           # Tauri configuration
│   └── icons/                    # App icons
├── package.json
├── svelte.config.js
├── vite.config.js
└── tsconfig.json
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start browser dev server |
| `pnpm build` | Build frontend for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Run Svelte type checking |
| `pnpm tauri dev` | Run Tauri desktop app (dev) |
| `pnpm tauri build` | Build Tauri desktop app |

## License

MIT
