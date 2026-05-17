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
  import { deletePlaylist } from '$lib/commands/library';
  import SettingsModal from '$lib/components/overlays/SettingsModal.svelte';
  import NowPlaying from '$lib/components/overlays/NowPlaying.svelte';
  import QueuePanel from '$lib/components/overlays/QueuePanel.svelte';
  import { onMount } from 'svelte';
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks } from '$lib/controllers/library';
  import { playQueueIndex, setQueue, togglePlayPause, playNext, playPrevious, stopPlayback, queueState } from '$lib/stores/queue';
  import { currentTrack, isPlaying, volume, formatTime } from '$lib/stores/player';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
  import type { Track } from '$lib/types';

  // Reactive sidebar width for grid
  let gridColumns = $derived(
    $sidebarCollapsed
      ? 'var(--sidebar-collapsed-width) 1fr'
      : 'var(--sidebar-width) 1fr'
  );

  onMount(async () => {
    try {
      const win = getCurrentWindow();
      const size = await win.innerSize();
      lastWindowSize.set({ width: size.width, height: size.height });
    } catch {}
    void initLibraryListeners();
    void refreshTracks();
    void refreshPlaylists();
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
    try {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(false);
      await win.setSize(new LogicalSize($lastWindowSize.width, $lastWindowSize.height));
      await win.center();
    } catch {}
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
</script>

{#if $miniPlayerMode}
  <!-- Mini Player Mode -->
  <div class="mini-player" data-tauri-drag-region>
    <div class="mini-art">
      {#if miniArtworkUrl}
        <img src={miniArtworkUrl} alt="" />
      {:else}
        <div class="mini-art-placeholder">
          <Icon name="music" size={22} color="var(--accent-primary)" />
        </div>
      {/if}
    </div>
    <div class="mini-info" data-tauri-drag-region>
      {#if $currentTrack}
        <div class="mini-title truncate">{$currentTrack.title}</div>
        <div class="mini-artist truncate">{$currentTrack.artist}</div>
      {:else}
        <div class="mini-title text-tertiary">No track playing</div>
        <div class="mini-artist truncate">—</div>
      {/if}
    </div>
    <div class="mini-controls">
      <button class="mini-btn" onclick={() => void playPrevious()} title="Previous">
        <Icon name="skip-back" size={16} />
      </button>
      <button class="mini-btn mini-play" onclick={() => void togglePlayPause()} title={$isPlaying ? 'Pause' : 'Play'}>
        <Icon name={$isPlaying ? 'pause' : 'play'} size={18} />
      </button>
      <button class="mini-btn" onclick={() => void playNext()} title="Next">
        <Icon name="skip-forward" size={16} />
      </button>
    </div>
    <button class="mini-exit" onclick={exitMiniPlayer} title="Exit mini player">
      <Icon name="maximize" size={14} />
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

  .mini-player {
    display: flex; align-items: center; gap: 12px;
    height: 100vh; padding: 12px 16px;
    background: var(--bg-primary);
    -webkit-app-region: drag; overflow: hidden;
  }
  .mini-art {
    width: 48px; height: 48px; border-radius: 8px;
    overflow: hidden; flex-shrink: 0;
    -webkit-app-region: no-drag;
  }
  .mini-art img { width: 100%; height: 100%; object-fit: cover; }
  .mini-art-placeholder {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: var(--bg-elevated);
  }
  .mini-info { flex: 1; min-width: 0; }
  .mini-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .mini-artist { font-size: 11px; color: var(--text-secondary); }
  .mini-controls { display: flex; align-items: center; gap: 2px; -webkit-app-region: no-drag; }
  .mini-btn {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary); background: transparent; border: none; cursor: pointer;
  }
  .mini-btn:hover { color: var(--text-primary); }
  .mini-play { width: 38px; height: 38px; background: var(--text-primary); color: var(--bg-primary); }
  .mini-exit {
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-tertiary); background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    cursor: pointer; -webkit-app-region: no-drag;
  }
  .mini-exit:hover { background: var(--bg-elevated); color: var(--text-primary); }
</style>