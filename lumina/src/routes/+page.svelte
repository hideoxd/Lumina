<script lang="ts">
  import Titlebar from '$lib/components/layout/Titlebar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import PlayerBar from '$lib/components/layout/PlayerBar.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ambientEnabled, currentView, sidebarCollapsed, searchQuery, activePlaylistId, miniPlayerMode, settingsOpen, lastWindowSize, queuePanelOpen } from '$lib/stores/ui';
  import { albums, artists, libraryLoading, scanProgress, trackCount, tracks as allTracks, visibleTracks } from '$lib/stores/library';
  import TrackList from '$lib/components/library/TrackList.svelte';
  import AlbumGrid from '$lib/components/library/AlbumGrid.svelte';
  import ArtistGrid from '$lib/components/library/ArtistGrid.svelte';
  import PlaylistGrid from '$lib/components/library/PlaylistGrid.svelte';
  import { playlists, selectedPlaylist, playlistTracks, selectPlaylist, refreshPlaylists } from '$lib/stores/playlists';
  import { scanDirectory, deletePlaylist } from '$lib/commands/library';
  import { downloadYoutubeVideo } from '$lib/commands/youtube';
  import SettingsModal from '$lib/components/overlays/SettingsModal.svelte';
  import NowPlaying from '$lib/components/overlays/NowPlaying.svelte';
  import QueuePanel from '$lib/components/overlays/QueuePanel.svelte';
  import { onMount } from 'svelte';
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks } from '$lib/controllers/library';
  import { playQueueIndex, setQueue, togglePlayPause, playNext, playPrevious, stopPlayback, queueState } from '$lib/stores/queue';
  import { currentTrack, isPlaying, volume, formatTime } from '$lib/stores/player';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import type { Track } from '$lib/types';

  // Reactive sidebar width for grid
  let gridColumns = $derived(
    $sidebarCollapsed
      ? 'var(--sidebar-collapsed-width) 1fr'
      : 'var(--sidebar-width) 1fr'
  );

  onMount(async () => {
    try {
      initLibraryListeners();
    } catch (e) {
      console.error('Failed to init library listeners:', e);
    }

    // Use allSettled so one failure doesn't block the other
    const results = await Promise.allSettled([
      refreshTracks(),
      refreshPlaylists()
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('App initialization partial failure:', result.reason);
      }
    }
  });

  async function handleAddMusic() {
    try {
      await addMusicFolderWithDialog();
    } catch {
      libraryLoading.set(false);
    }
  }

  async function handlePlayFromList(track: Track, index: number) {
    setQueue($visibleTracks, index);
    await playQueueIndex(index);
  }

  async function handlePlayFromCustomList(list: Track[], index: number) {
    if (list.length === 0) return;
    setQueue(list, index);
    await playQueueIndex(index);
  }

  let visibleFavorites = $derived($visibleTracks.filter((t) => t.favorite));

  let miniArtworkUrl = $state('');

  $effect(() => {
    const art = $currentTrack?.artwork_path;
    if (!art) { miniArtworkUrl = ''; return; }
    getArtworkUrl(art).then(url => { miniArtworkUrl = url; }).catch(() => { miniArtworkUrl = ''; });
  });

  let wasMiniMode = $state(false);

  $effect(() => {
    if ($miniPlayerMode && !wasMiniMode) {
      void enterMiniPlayer();
      queuePanelOpen.set(false);
    }
    wasMiniMode = $miniPlayerMode;
  });

  // ── Mini Player Tauri Window Management ──
  let savedWindowState = $state<{ width: number; height: number; x: number; y: number } | null>(null);
  let winApi: any = null;

  async function ensureWinApi() {
    if (winApi) return winApi;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { PhysicalSize, PhysicalPosition } = await import('@tauri-apps/api/dpi');
      winApi = { getCurrentWindow, PhysicalSize, PhysicalPosition };
      return winApi;
    } catch {
      return null;
    }
  }

  async function enterMiniPlayer() {
    const api = await ensureWinApi();
    if (api) {
      try {
        const appWindow = api.getCurrentWindow();
        const isMax = await appWindow.isMaximized();
        if (isMax) await appWindow.toggleMaximize();
        const size = await appWindow.size();
        const pos = await appWindow.position();
        savedWindowState = {
          width: size.width,
          height: size.height,
          x: pos.x,
          y: pos.y,
        };
        const sf = await appWindow.scaleFactor();
        const miniW = Math.round(360 * sf);
        const miniH = Math.round(140 * sf);
        const maxX = Math.round(window.screen.availWidth * sf);
        const maxY = Math.round(window.screen.availHeight * sf);
        await appWindow.setSize(new api.PhysicalSize(miniW, miniH));
        await appWindow.setPosition(new api.PhysicalPosition(maxX - miniW - Math.round(15 * sf), maxY - miniH - Math.round(15 * sf)));
        await appWindow.setAlwaysOnTop(true);
      } catch (e) {
        console.warn('Tauri window operation failed:', e);
      }
    }
    miniPlayerMode.set(true);
  }

  async function exitMiniPlayer() {
    const api = await ensureWinApi();
    if (api && savedWindowState) {
      try {
        const appWindow = api.getCurrentWindow();
        await appWindow.setAlwaysOnTop(false);
        await appWindow.setSize(new api.PhysicalSize(savedWindowState.width, savedWindowState.height));
        await appWindow.setPosition(new api.PhysicalPosition(savedWindowState.x, savedWindowState.y));
      } catch (e) {
        console.warn('Tauri window restore failed:', e);
      }
      savedWindowState = null;
    }
    miniPlayerMode.set(false);
  }

  async function handlePlayPlaylist(list: Track[], index: number) {
    await handlePlayFromCustomList(list, index);
  }

  async function handleDeleteCurrentPlaylist() {
    const pl = $selectedPlaylist;
    if (!pl) return;
    try {
      await deletePlaylist(pl.id);
      selectPlaylist(null);
      await refreshPlaylists();
    } catch (e) {
      console.error('Failed to delete playlist', e);
    }
  }

  async function handleSelectPlaylist(pl: import('$lib/types').Playlist) {
    selectPlaylist(pl);
  }

  let recentTracks = $derived(
    (() => {
      const q = $searchQuery.trim().toLowerCase();
      let list = $allTracks.filter((t) => !!t.last_played);
      if (q) {
        list = list.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.album_artist ?? ''} ${t.genre ?? ''}`.toLowerCase().includes(q));
      }
      return [...list].sort((a, b) => (b.last_played || '').localeCompare(a.last_played || ''));
    })()
  );

  let youtubeUrl = $state('');
  let downloadingYoutube = $state(false);
  let downloadStatus = $state('');
  
  async function handleDownloadYoutube() {
    if (!youtubeUrl.trim() || downloadingYoutube) return;
    downloadingYoutube = true;
    downloadStatus = 'Downloading… (first time may take a moment to set up)';
    try {
      const filePath = await downloadYoutubeVideo(youtubeUrl.trim());
      youtubeUrl = '';
      downloadStatus = 'Download complete! Refreshing library…';
      await refreshTracks();
      downloadStatus = 'Added to library successfully!';
      setTimeout(() => { downloadStatus = ''; }, 3000);
    } catch (e: any) {
      console.error('Failed to download youtube video:', e);
      downloadStatus = '';
      alert('Download failed: ' + (typeof e === 'string' ? e : e?.message || JSON.stringify(e)));
    } finally {
      downloadingYoutube = false;
    }
  }
</script>

{#if $miniPlayerMode}
  <!-- Compact Mini Player -->
  <div class="mini-player" data-tauri-drag-region>
    <div class="mini-art">
      {#if miniArtworkUrl}
        <img src={miniArtworkUrl} alt="" />
      {:else}
        <div class="mini-art-placeholder">
          <Icon name="music" size={20} color="rgba(255,255,255,0.4)" />
        </div>
      {/if}
    </div>
    <div class="mini-body">
      <div class="mini-info">
        {#if $currentTrack}
          <div class="mini-title truncate">{$currentTrack.title}</div>
          <div class="mini-artist truncate">{$currentTrack.artist}</div>
        {:else}
          <div class="mini-title" style="opacity:0.5">No track</div>
        {/if}
      </div>
      <div class="mini-controls">
        <button class="mini-btn" onclick={() => void playPrevious()} title="Previous">
          <Icon name="skip-back" size={13} />
        </button>
        <button class="mini-play-btn" onclick={() => void togglePlayPause()} title={$isPlaying ? 'Pause' : 'Play'}>
          <Icon name={$isPlaying ? 'pause' : 'play'} size={15} />
        </button>
        <button class="mini-btn" onclick={() => void playNext()} title="Next">
          <Icon name="skip-forward" size={13} />
        </button>
      </div>
    </div>
    <button class="mini-close" onclick={exitMiniPlayer} title="Exit mini player (restore window)">
      <Icon name="x" size={11} />
    </button>
  </div>
{:else}
<div class="app-container">
  <!-- Sidebar -->
  <div class="app-sidebar">
    <Sidebar />
  </div>

  <!-- Right side: Titlebar + Content + Player -->
  <div class="app-main">
    <!-- Titlebar -->
    <div class="app-titlebar">
      <Titlebar />
    </div>

    <!-- Main Content Area -->
    <main class="app-content">
      <div class="content-inner">
        {#if $currentView === 'tracks'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">All Tracks</h1>
              <span class="view-count">{$trackCount}</span>
            </div>
            <button class="add-btn" onclick={handleAddMusic}>
              <Icon name="plus" size={14} />
              <span>Add Music</span>
            </button>
          </div>

          {#if $libraryLoading && $scanProgress}
            <div class="scan-status">
              <span class="scan-text">Scanning… {$scanProgress.scanned}/{$scanProgress.total}</span>
              <div class="scan-bar">
                <div class="scan-bar-fill" style="width: {$scanProgress.total > 0 ? ($scanProgress.scanned / $scanProgress.total) * 100 : 0}%"></div>
              </div>
            </div>
          {/if}

          <div class="tracks-list-container">
            <TrackList tracks={$visibleTracks} onPlay={handlePlayFromList} />
          </div>

        {:else if $currentView === 'albums'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Albums</h1>
              <span class="view-count">{$albums.length}</span>
            </div>
          </div>
          <AlbumGrid
            albums={$albums}
            tracks={$allTracks}
            onPlayAlbum={(list) => void handlePlayFromCustomList(list, 0)}
          />

        {:else if $currentView === 'artists'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Artists</h1>
              <span class="view-count">{$artists.length}</span>
            </div>
          </div>
          <ArtistGrid
            artists={$artists}
            tracks={$allTracks}
            onPlayArtist={(list) => void handlePlayFromCustomList(list, 0)}
          />

        {:else if $currentView === 'playlists'}
          {#if $selectedPlaylist}
            <div class="view-header">
              <div class="view-title-row">
                <button class="back-btn" onclick={() => selectPlaylist(null)}>
                  <Icon name="chevron-left" size={16} />
                </button>
                <h1 class="view-title">{$selectedPlaylist.name}</h1>
                <span class="view-count">{$playlistTracks.length}</span>
              </div>
              <button class="add-btn danger" onclick={handleDeleteCurrentPlaylist}>
                <Icon name="x" size={14} />
                <span>Delete</span>
              </button>
            </div>
            {#if $playlistTracks.length === 0}
              <p class="empty-text">This playlist is empty.</p>
            {:else}
              <div class="tracks-list-container">
                <TrackList
                  tracks={$playlistTracks}
                  playlistId={$selectedPlaylist?.id}
                  onPlay={(t: Track, i: number) => void handlePlayPlaylist($playlistTracks, i)}
                />
              </div>
            {/if}
          {:else}
            <div class="view-header">
              <div class="view-title-row">
                <h1 class="view-title">Playlists</h1>
                <span class="view-count">{$playlists.length}</span>
              </div>
            </div>
            {#if $playlists.length === 0}
              <p class="empty-text">No playlists yet.</p>
            {:else}
              <PlaylistGrid playlists={$playlists} onSelect={handleSelectPlaylist} />
            {/if}
          {/if}

        {:else if $currentView === 'favorites'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Favorites</h1>
              <span class="view-count">{visibleFavorites.length}</span>
            </div>
          </div>
          {#if visibleFavorites.length === 0}
            <p class="empty-text">No favorites yet — right-click a track to add one.</p>
          {:else}
            <div class="tracks-list-container">
              <TrackList
                tracks={visibleFavorites}
                onPlay={(t: Track, i: number) => void handlePlayFromCustomList(visibleFavorites, i)}
              />
            </div>
          {/if}

        {:else if $currentView === 'recent'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Recently Played</h1>
              <span class="view-count">{recentTracks.length}</span>
            </div>
          </div>
          {#if recentTracks.length === 0}
            <p class="empty-text">Play some tracks to see them here.</p>
          {:else}
            <div class="tracks-list-container">
              <TrackList
                tracks={recentTracks}
                onPlay={(t: Track, i: number) => void handlePlayFromCustomList(recentTracks, i)}
              />
            </div>
          {/if}

        {:else if $currentView === 'youtube'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">YouTube Download</h1>
            </div>
          </div>
          <div class="yt-container">
            <div class="yt-card glass">
              <Icon name="youtube" size={48} color="var(--text-primary)" />
              <h2>Download Audio</h2>
              <p>Paste a YouTube URL below to download it permanently to your Lumina library.</p>
              
              <div class="yt-input-row">
                <input 
                  type="text" 
                  class="yt-input" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  bind:value={youtubeUrl}
                  onkeydown={(e) => { if (e.key === 'Enter') handleDownloadYoutube() }}
                />
                <button class="yt-download-btn" onclick={handleDownloadYoutube} disabled={downloadingYoutube || !youtubeUrl.trim()}>
                  {#if downloadingYoutube}
                    <span class="spinner"></span> Downloading…
                  {:else}
                    <Icon name="download" size={16} /> Download
                  {/if}
                </button>
              </div>
              {#if downloadStatus}
                <p class="yt-status">{downloadStatus}</p>
              {/if}
              <p class="yt-note">Requires <a href="https://ffmpeg.org" target="_blank" rel="noopener">ffmpeg</a> installed on your system for audio conversion.</p>
            </div>
          </div>
        {/if}
      </div>
    </main>

    <!-- Floating Player -->
    <div class="app-player">
      <PlayerBar />
    </div>
  </div>
</div>
{/if}

<!-- Overlays -->
<SettingsModal />
<NowPlaying />
<QueuePanel />

<style>
  /* === App Main (right side column) === */
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .app-titlebar { flex-shrink: 0; }

  .app-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .content-inner {
    padding: 32px 40px 140px 40px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  .view-title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .view-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.03em;
    margin: 0;
  }

  .view-count {
    font-size: 13px;
    color: var(--text-tertiary);
    font-weight: 400;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-elevated);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-btn:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text-primary);
  }

  .add-btn.danger:hover {
    background: rgba(220,38,38,0.15);
    color: #ef4444;
  }

  .scan-status {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .scan-text {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .scan-bar {
    flex: 1;
    height: 4px;
    background: var(--bg-elevated);
    border-radius: 2px;
    overflow: hidden;
    max-width: 300px;
  }

  .scan-bar-fill {
    height: 100%;
    background: var(--text-primary);
    transition: width 0.3s ease;
  }

  .tracks-list-container {
    flex: 1;
    min-height: 0;
  }

  .empty-text {
    color: var(--text-tertiary);
    font-size: 14px;
    padding: 40px 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .back-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  /* ====== Compact Mini Player ====== */
  .mini-player {
    display: flex;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background: var(--bg-elevated);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 0 8px 0 4px;
    gap: 8px;
    -webkit-app-region: drag;
    overflow: hidden;
  }

  .mini-art {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-primary);
  }

  .mini-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .mini-art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }

  .mini-body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    -webkit-app-region: no-drag;
  }

  .mini-info {
    flex: 1;
    min-width: 0;
  }

  .mini-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .mini-artist {
    font-size: 10px;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .mini-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .mini-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
    transition: all 0.1s;
    -webkit-app-region: no-drag;
  }

  .mini-btn:hover {
    color: var(--text-primary);
    background: rgba(255,255,255,0.1);
  }

  .mini-play-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-primary);
    color: var(--bg-primary);
    border: none;
    cursor: pointer;
    transition: all 0.1s;
    -webkit-app-region: no-drag;
  }

  .mini-play-btn:hover {
    transform: scale(1.08);
  }

  .mini-close {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-tertiary);
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    transition: all 0.1s;
  }

  .mini-close:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text-primary);
  }

  /* ====== YouTube Download View ====== */
  .yt-container {
    padding: 40px;
    display: flex;
    justify-content: center;
  }
  .yt-card {
    width: 100%;
    max-width: 600px;
    padding: 40px;
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  .yt-card h2 { font-size: 24px; font-weight: 700; color: white; margin: 0; }
  .yt-card p { color: var(--text-secondary); margin: 0 0 16px 0; font-size: 14px; }
  .yt-input-row {
    display: flex;
    width: 100%;
    gap: 12px;
  }
  .yt-input {
    flex: 1;
    height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-md);
    background: rgba(0,0,0,0.4);
    border: 1px solid var(--glass-border);
    color: white;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }
  .yt-input:focus { border-color: white; }
  .yt-download-btn {
    height: 44px;
    padding: 0 24px;
    border-radius: var(--radius-md);
    background: white;
    color: black;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }
  .yt-download-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255,255,255,0.2);
  }
  .yt-download-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .spinner {
    width: 14px; height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .yt-status {
    color: #4ade80;
    font-size: 13px;
    margin: 0;
    animation: fadeIn 0.3s ease;
  }
  .yt-note {
    color: var(--text-disabled);
    font-size: 11px;
    margin: 8px 0 0 0;
  }
  .yt-note a {
    color: var(--text-secondary);
    text-decoration: underline;
  }
</style>