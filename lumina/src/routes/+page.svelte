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
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks, checkFolderPermission, requestFolderPermission, ensureFolderPermissionAtClick } from '$lib/controllers/library';
  import { playQueueIndex, setQueue, togglePlayPause, playNext, playPrevious, stopPlayback, queueState } from '$lib/stores/queue';
  import { currentTrack, isPlaying, volume, formatTime } from '$lib/stores/player';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import type { Track } from '$lib/types';
  import { youtubeApiKeyStore, hasValidApiKey } from '$lib/stores/api';

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
    if (track && !track.file_path.startsWith('youtube:')) {
      const ok = await ensureFolderPermissionAtClick();
      if (!ok) return; // user denied permission
    }
    setQueue($visibleTracks, index);
    await playQueueIndex(index);
  }

  async function handlePlayFromCustomList(list: Track[], index: number) {
    if (list.length === 0) return;
    const track = list[index];
    if (track && !track.file_path.startsWith('youtube:')) {
      const ok = await ensureFolderPermissionAtClick();
      if (!ok) return; // user denied permission
    }
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

  // ── YouTube Search & Playback State ──
  let ytSearchQuery = $state('');
  let ytLoading = $state(false);
  let ytResults = $state<Track[]>([]);
  let ytError = $state('');
  let inputApiKey = $state('');

  $effect(() => {
    inputApiKey = $youtubeApiKeyStore;
  });

  function saveApiKey() {
    if (inputApiKey.trim()) {
      youtubeApiKeyStore.set(inputApiKey.trim());
    }
  }

  async function performYoutubeSearch() {
    if (!ytSearchQuery.trim()) return;
    const apiKey = $youtubeApiKeyStore;
    if (!hasValidApiKey(apiKey)) {
      ytError = 'API Key is not configured. Please add your key below or in Settings.';
      return;
    }

    ytLoading = true;
    ytError = '';
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(ytSearchQuery)}&type=video&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'YouTube API search failed');
      }

      ytResults = (data.items || []).map((item: any) => {
        return {
          id: 'yt-' + item.id.videoId,
          title: decodeHtmlEntities(item.snippet.title),
          artist: decodeHtmlEntities(item.snippet.channelTitle),
          album: 'YouTube Single',
          album_artist: 'YouTube',
          genre: 'YouTube',
          year: null,
          track_number: null,
          disc_number: null,
          duration: 0,
          file_path: 'youtube:' + item.id.videoId,
          file_format: 'youtube',
          file_size: 0,
          bitrate: null,
          sample_rate: null,
          composer: null,
          publisher: null,
          comments: null,
          artwork_path: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
          date_added: new Date().toISOString(),
          last_played: null,
          play_count: 0,
          favorite: false
        };
      });
    } catch (e: any) {
      console.error('[lumina-youtube] Search failed:', e);
      ytError = e.message || 'Search failed. Please check your API key or connection.';
      ytResults = [];
    } finally {
      ytLoading = false;
    }
  }

  function decodeHtmlEntities(str: string): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }
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
        {:else if $currentView === 'youtube'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">YouTube Search</h1>
              <span class="view-count">{ytResults.length}</span>
            </div>
          </div>

          <div class="yt-search-container">
            <div class="yt-search-bar">
              <input
                type="text"
                class="yt-search-input"
                placeholder="Search YouTube for songs, artists, or channels…"
                bind:value={ytSearchQuery}
                onkeydown={(e) => { if (e.key === 'Enter') void performYoutubeSearch() }}
              />
              <button class="yt-search-btn" onclick={() => void performYoutubeSearch()} title="Search">
                <Icon name="search" size={16} />
              </button>
            </div>

            {#if ytError}
              <div class="yt-error-banner">
                {ytError}
              </div>
            {/if}

            {#if !hasValidApiKey($youtubeApiKeyStore)}
              <div class="yt-setup-card">
                <div class="yt-setup-glow"></div>
                <div class="yt-setup-title">YouTube API Key Setup</div>
                <p class="yt-setup-desc">
                  Provide your personal Google Cloud YouTube Data API v3 key below to search and stream tracks directly inside Lumina.
                </p>

                <div class="yt-input-group">
                  <input
                    type="password"
                    class="yt-key-input"
                    placeholder="Enter your secret YouTube API Key (AIzaSy...)"
                    bind:value={inputApiKey}
                    onkeydown={(e) => { if (e.key === 'Enter') saveApiKey() }}
                  />
                  <button class="yt-save-btn" onclick={saveApiKey} disabled={!inputApiKey.trim()}>
                    Save Key
                  </button>
                </div>

                <p class="yt-setup-subdesc">
                  Alternatively, you can save it inside <code>src/lib/config/api.ts</code> in your editor.
                </p>
                <div class="yt-setup-warning">
                  <Icon name="lock" size={13} color="rgba(255,255,255,0.4)" />
                  <span>The API key is completely masked, stored only locally in your browser, and never shared.</span>
                </div>
              </div>
            {:else if ytLoading}
              <p class="empty-text">Searching YouTube… Please wait.</p>
            {:else if ytResults.length === 0}
              <p class="empty-text">Type a search term above and press Enter to find music.</p>
            {:else}
              <div class="yt-results-grid">
                {#each ytResults as track, i}
                  <div class="yt-card" onclick={() => void handlePlayFromCustomList(ytResults, i)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') void handlePlayFromCustomList(ytResults, i) }}>
                    <div class="yt-thumb-wrapper">
                      {#if track.artwork_path}
                        <img src={track.artwork_path} class="yt-thumb" alt="" />
                      {/if}
                      <div class="yt-play-overlay">
                        <div class="yt-play-badge">
                          <Icon name="play" size={18} />
                        </div>
                      </div>
                    </div>
                    <div class="yt-card-info">
                      <div class="yt-card-title">{track.title}</div>
                      <div class="yt-card-artist">{track.artist}</div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
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

  /* ====== YouTube Search View ====== */
  .yt-search-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
  }

  .yt-search-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 6px 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .yt-search-bar:focus-within {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 24px rgba(255, 255, 255, 0.05);
  }

  .yt-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 14px;
    padding: 8px 0;
  }

  .yt-search-input::placeholder {
    color: var(--text-tertiary);
  }

  .yt-search-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .yt-search-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .yt-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    margin-top: 16px;
  }

  .yt-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .yt-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  }

  .yt-thumb-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .yt-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .yt-card:hover .yt-thumb {
    transform: scale(1.05);
  }

  .yt-play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .yt-card:hover .yt-play-overlay {
    opacity: 1;
  }

  .yt-play-badge {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--text-primary);
    color: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transform: scale(0.9);
    transition: transform 0.2s ease;
  }

  .yt-card:hover .yt-play-badge {
    transform: scale(1);
  }

  .yt-card-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .yt-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .yt-card-artist {
    font-size: 11px;
    color: var(--text-secondary);
  }

  /* ====== Setup Card ====== */
  .yt-setup-card {
    position: relative;
    padding: 32px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.3);
  }

  .yt-setup-glow {
    position: absolute;
    top: -100px;
    right: -100px;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .yt-setup-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .yt-setup-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .yt-input-group {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
  }

  .yt-key-input {
    flex: 1;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.2s ease;
  }

  .yt-key-input:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
  }

  .yt-save-btn {
    padding: 10px 20px;
    background: #ef4444;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .yt-save-btn:hover:not(:disabled) {
    background: #f87171;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }

  .yt-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .yt-setup-subdesc {
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 4px 0 0 0;
  }

  .yt-setup-subdesc code {
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #ef4444;
  }

  .yt-setup-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }

  .yt-error-banner {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    width: 100%;
    max-width: 600px;
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