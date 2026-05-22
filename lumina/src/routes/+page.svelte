<script lang="ts">
  import Titlebar from '$lib/components/layout/Titlebar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import PlayerBar from '$lib/components/layout/PlayerBar.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ambientEnabled, currentView, sidebarCollapsed, searchQuery, activePlaylistId, miniPlayerMode, settingsOpen, lastWindowSize, queuePanelOpen } from '$lib/stores/ui';
  import { albums, artists, libraryLoading, scanProgress, trackCount, tracks as allTracks, visibleTracks, folderPermissionState } from '$lib/stores/library';
  import TrackList from '$lib/components/library/TrackList.svelte';
  import AlbumGrid from '$lib/components/library/AlbumGrid.svelte';
  import ArtistGrid from '$lib/components/library/ArtistGrid.svelte';
  import PlaylistGrid from '$lib/components/library/PlaylistGrid.svelte';
  import { playlists, selectedPlaylist, playlistTracks, selectPlaylist, refreshPlaylists } from '$lib/stores/playlists';
  import { scanDirectory, deletePlaylist } from '$lib/commands/library';
  import SettingsModal from '$lib/components/overlays/SettingsModal.svelte';
  import NowPlaying from '$lib/components/overlays/NowPlaying.svelte';
  import QueuePanel from '$lib/components/overlays/QueuePanel.svelte';
  import { onMount } from 'svelte';
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks, checkFolderPermission, requestFolderPermission } from '$lib/controllers/library';
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

    try {
      await checkFolderPermission();
    } catch (e) {
      console.error('Failed to check folder permission:', e);
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
      const folderName = await addMusicFolderWithDialog();
      if (folderName) {
        await checkFolderPermission();
      }
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

  // ── Drag-and-drop & Floating State for Mini Player ──
  let miniX = $state(20);
  let miniY = $state(20);
  let isDragging = $state(false);

  onMount(() => {
    // Initial position in bottom-right corner
    miniX = window.innerWidth - 320 - 24;
    miniY = window.innerHeight - 72 - 24;
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  function handleResize() {
    if (miniX > window.innerWidth - 320) {
      miniX = Math.max(0, window.innerWidth - 320 - 24);
    }
    if (miniY > window.innerHeight - 72) {
      miniY = Math.max(0, window.innerHeight - 72 - 24);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, or standard control regions
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    isDragging = true;
    const startX = e.clientX - miniX;
    const startY = e.clientY - miniY;

    function handleMouseMove(moveEvent: MouseEvent) {
      miniX = Math.max(0, Math.min(window.innerWidth - 320, moveEvent.clientX - startX));
      miniY = Math.max(0, Math.min(window.innerHeight - 72, moveEvent.clientY - startY));
    }

    function handleMouseUp() {
      isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  async function handleRequestFolderPermission() {
    try {
      const granted = await requestFolderPermission();
      if (granted) {
        await refreshTracks();
      }
    } catch (e) {
      console.error('[lumina] Failed to request folder permission:', e);
    }
  }

  async function enterMiniPlayer() {
    miniPlayerMode.set(true);
    // Center-ish bottom right corner positioning on entrance
    miniX = window.innerWidth - 320 - 24;
    miniY = window.innerHeight - 72 - 24;
  }

  async function exitMiniPlayer() {
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
</script>

{#if $miniPlayerMode}
  <!-- Premium Glassmorphic Draggable Floating Mini Player -->
  <div class="mini-player-overlay">
    {#if miniArtworkUrl}
      <div class="mini-player-backdrop-art" style="background-image: url({miniArtworkUrl})"></div>
    {/if}
    <div class="mini-player-backdrop-dim"></div>

    <div 
      class="mini-player-floating" 
      style="left: {miniX}px; top: {miniY}px;" 
      onmousedown={handleMouseDown}
      role="presentation"
    >
      <div class="mini-drag-handle">
        <Icon name="grid" size={10} color="rgba(255,255,255,0.4)" />
      </div>

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
        {#if $folderPermissionState === 'stored_needs_permission'}
          <div class="permission-banner">
            <div class="permission-banner-content">
              <Icon name="alert-triangle" size={18} color="#ef4444" />
              <span>Lumina needs permission to access your local music library.</span>
            </div>
            <button class="permission-btn" onclick={handleRequestFolderPermission}>
              Grant Access
            </button>
          </div>
        {/if}

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
  .mini-player-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .mini-player-backdrop-art {
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    background-size: cover;
    background-position: center;
    filter: blur(40px) brightness(0.25);
    z-index: 1;
    pointer-events: none;
    transition: background-image 0.5s ease;
  }

  .mini-player-backdrop-dim {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%);
    z-index: 2;
    pointer-events: none;
  }

  .mini-player-floating {
    position: absolute;
    width: 320px;
    height: 72px;
    display: flex;
    align-items: center;
    background: rgba(20, 20, 20, 0.45);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0 12px;
    gap: 10px;
    z-index: 3;
    cursor: grab;
    pointer-events: auto;
    user-select: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .mini-player-floating:active {
    cursor: grabbing;
    border-color: rgba(255, 255, 255, 0.16);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .mini-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    padding-right: 2px;
    opacity: 0.3;
    transition: opacity 0.2s;
  }

  .mini-player-floating:hover .mini-drag-handle {
    opacity: 0.7;
  }

  .mini-art {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-primary);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
    gap: 8px;
    min-width: 0;
  }

  .mini-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .mini-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .mini-artist {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .mini-controls {
    display: flex;
    align-items: center;
    gap: 4px;
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
    transition: all 0.15s ease;
  }

  .mini-btn:hover {
    color: var(--text-primary);
    background: rgba(255,255,255,0.08);
  }

  .mini-play-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-primary);
    color: var(--bg-primary);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mini-play-btn:hover {
    transform: scale(1.08);
  }

  .mini-close {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-tertiary);
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .mini-close:hover {
    background: rgba(255,255,255,0.08);
    color: var(--text-primary);
  }

  /* ====== Permission Banner ====== */
  .permission-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    margin-bottom: 24px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
    animation: slideDown 0.3s ease;
  }

  .permission-banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .permission-btn {
    padding: 6px 14px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .permission-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  }

  @keyframes slideDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>