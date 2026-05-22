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

  async function exitMiniPlayer() {
    miniPlayerMode.set(false);
  }

  $effect(() => {
    const art = $currentTrack?.artwork_path;
    if (!art) { miniArtworkUrl = ''; return; }
    getArtworkUrl(art).then(url => { miniArtworkUrl = url; }).catch(() => { miniArtworkUrl = ''; });
  });

  $effect(() => {
    if ($miniPlayerMode) {
      queuePanelOpen.set(false);
    }
  });

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
  <!-- Square Mini Player -->
  <div class="mini-player" data-tauri-drag-region>
    <div class="mini-art-bg">
      {#if miniArtworkUrl}
        <img src={miniArtworkUrl} alt="" />
      {:else}
        <div class="mini-art-placeholder">
          <Icon name="music" size={40} color="rgba(255,255,255,0.3)" />
        </div>
      {/if}
    </div>
    <div class="mini-overlay">
      <div class="mini-top-bar" data-tauri-drag-region>
        <button class="mini-exit-btn" onclick={exitMiniPlayer} title="Exit mini player">
          <Icon name="maximize" size={12} />
        </button>
      </div>
      <div class="mini-bottom">
        <div class="mini-track-info">
          {#if $currentTrack}
            <div class="mini-track-title truncate">{$currentTrack.title}</div>
            <div class="mini-track-artist truncate">{$currentTrack.artist}</div>
          {:else}
            <div class="mini-track-title" style="opacity:0.5">No track</div>
          {/if}
        </div>
        <div class="mini-play-controls">
          <button class="mini-ctrl-btn" onclick={() => void playPrevious()}>
            <Icon name="skip-back" size={14} />
          </button>
          <button class="mini-play-btn" onclick={() => void togglePlayPause()}>
            <Icon name={$isPlaying ? 'pause' : 'play'} size={16} />
          </button>
          <button class="mini-ctrl-btn" onclick={() => void playNext()}>
            <Icon name="skip-forward" size={14} />
          </button>
        </div>
      </div>
    </div>
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

  /* ====== Square Mini Player ====== */
  .mini-player {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #0a0a0a;
    -webkit-app-region: drag;
  }

  .mini-art-bg {
    position: absolute;
    inset: 0;
  }

  .mini-art-bg img {
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
    background: #111;
  }

  .mini-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%);
    -webkit-app-region: no-drag;
  }

  .mini-top-bar {
    display: flex;
    justify-content: flex-end;
    padding: 6px 6px;
    -webkit-app-region: drag;
  }

  .mini-exit-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    color: rgba(255,255,255,0.7);
    border: none;
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: all 0.1s;
  }

  .mini-exit-btn:hover {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .mini-bottom {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mini-track-info {
    min-width: 0;
  }

  .mini-track-title {
    font-size: 12px;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }

  .mini-track-artist {
    font-size: 10px;
    color: rgba(255,255,255,0.65);
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }

  .mini-play-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .mini-ctrl-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: rgba(255,255,255,0.8);
    border: none;
    cursor: pointer;
    transition: all 0.1s;
  }

  .mini-ctrl-btn:hover {
    color: white;
    background: rgba(255,255,255,0.15);
  }

  .mini-play-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.95);
    color: #000;
    border: none;
    cursor: pointer;
    transition: all 0.1s;
  }

  .mini-play-btn:hover {
    background: #fff;
    transform: scale(1.05);
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