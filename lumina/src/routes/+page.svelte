<script lang="ts">
  import Titlebar from '$lib/components/layout/Titlebar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import PlayerBar from '$lib/components/layout/PlayerBar.svelte';
  import GlassCard from '$lib/components/glass/GlassCard.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ambientEnabled, currentView, sidebarCollapsed, searchQuery } from '$lib/stores/ui';
  import { albums, artists, libraryLoading, scanProgress, trackCount, tracks as allTracks, visibleTracks } from '$lib/stores/library';
  import TrackList from '$lib/components/library/TrackList.svelte';
  import AlbumGrid from '$lib/components/library/AlbumGrid.svelte';
  import ArtistGrid from '$lib/components/library/ArtistGrid.svelte';
  import SettingsModal from '$lib/components/overlays/SettingsModal.svelte';
  import NowPlaying from '$lib/components/overlays/NowPlaying.svelte';
  import QueuePanel from '$lib/components/overlays/QueuePanel.svelte';
  import { onMount } from 'svelte';
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks } from '$lib/controllers/library';
  import { playQueueIndex, setQueue } from '$lib/stores/queue';
  import type { Track } from '$lib/types';

  // Reactive sidebar width for grid
  let gridColumns = $derived(
    $sidebarCollapsed
      ? 'var(--sidebar-collapsed-width) 1fr'
      : 'var(--sidebar-width) 1fr'
  );

  onMount(() => {
    void initLibraryListeners();
    void refreshTracks();
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

  let recentTracks = $derived(() => {
    const q = $searchQuery.trim().toLowerCase();
    let list = $allTracks.filter((t) => !!t.last_played);
    if (q) {
      list = list.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.genre}`.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.last_played || '').localeCompare(a.last_played || ''));
  });
</script>

<div
  class="app-container"
  style="grid-template-columns: {gridColumns};"
>
  <!-- Titlebar -->
  <div class="app-titlebar">
    <Titlebar />
  </div>

  <!-- Sidebar -->
  <div class="app-sidebar">
    <Sidebar />
  </div>

  <!-- Main Content Area -->
  <main class="app-content">
    <!-- Ambient background gradient (animated) -->
      {#if $ambientEnabled}
        <div class="ambient-bg" aria-hidden="true">
          <div class="ambient-orb orb-1"></div>
          <div class="ambient-orb orb-2"></div>
          <div class="ambient-orb orb-3"></div>
        </div>
      {/if}

    <div class="content-inner">
      {#if $currentView === 'tracks'}
        <!-- Tracks View -->
        <div class="view-header animate-fade-in-up">
          <div class="view-title-section">
            <h1 class="view-title">All Tracks</h1>
            <span class="view-count">{$trackCount} tracks</span>
          </div>
          <div class="view-actions">
            <GlassButton variant="default" size="sm">
              <Icon name="grid" size={14} />
            </GlassButton>
            <GlassButton variant="default" size="sm">
              <Icon name="list-view" size={14} />
            </GlassButton>
            <GlassButton variant="primary" size="sm" onclick={handleAddMusic}>
              <Icon name="folder-plus" size={14} />
              <span>Add Music</span>
            </GlassButton>
          </div>
        </div>

        {#if $libraryLoading && $scanProgress}
          <div class="scan-status animate-fade-in-up delay-1">
            <GlassCard padding="md" radius="xl">
              <div class="scan-row">
                <div class="scan-left">
                  <div class="scan-dot"></div>
                  <span class="scan-text">Scanning…</span>
                  <span class="scan-sub">{$scanProgress.scanned} / {$scanProgress.total}</span>
                </div>
                <div class="scan-right">
                  <div class="scan-bar">
                    <div
                      class="scan-bar-fill"
                      style="width: {$scanProgress.total > 0 ? ($scanProgress.scanned / $scanProgress.total) * 100 : 0}%"
                    ></div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        {/if}

        <!-- Empty state (shown when no tracks) -->
        {#if $trackCount === 0}
          <div class="empty-state animate-fade-in-up delay-2">
            <GlassCard padding="xl" radius="2xl">
              <div class="empty-content">
                <div class="empty-icon-container">
                  <div class="empty-icon-ring ring-1"></div>
                  <div class="empty-icon-ring ring-2"></div>
                  <div class="empty-icon-ring ring-3"></div>
                  <div class="empty-icon">
                    <Icon name="music" size={48} color="var(--accent-primary)" />
                  </div>
                </div>

                <h2 class="empty-title">Your Library is Empty</h2>
                <p class="empty-description">
                  Add a folder to start building your music library.<br />
                  Lumina supports MP3, FLAC, WAV, M4A, OGG, AAC, and more.
                </p>

                <div class="empty-actions">
                  <GlassButton variant="primary" size="lg" onclick={handleAddMusic}>
                    <Icon name="folder-plus" size={18} />
                    <span>Add Music Folder</span>
                  </GlassButton>
                </div>

                <div class="supported-formats">
                  <span class="format-label">Supported formats:</span>
                  <div class="format-tags">
                    {#each ['MP3', 'FLAC', 'WAV', 'M4A', 'OGG', 'AAC', 'AIFF', 'OPUS'] as fmt}
                      <span class="format-tag">{fmt}</span>
                    {/each}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        {:else}
          <div class="tracks-list animate-fade-in-up delay-1">
            <GlassCard padding="md" radius="2xl" class="tracks-card">
              <TrackList tracks={$visibleTracks} onPlay={handlePlayFromList} />
            </GlassCard>
          </div>
        {/if}

      {:else if $currentView === 'albums'}
        <div class="view-header animate-fade-in-up">
          <div class="view-title-section">
            <h1 class="view-title">Albums</h1>
            <span class="view-count">{$albums.length} albums</span>
          </div>
        </div>
        <div class="animate-fade-in-up delay-1">
          <AlbumGrid
            albums={$albums}
            tracks={$allTracks}
            onPlayAlbum={(list) => void handlePlayFromCustomList(list, 0)}
          />
        </div>

      {:else if $currentView === 'artists'}
        <div class="view-header animate-fade-in-up">
          <div class="view-title-section">
            <h1 class="view-title">Artists</h1>
            <span class="view-count">{$artists.length} artists</span>
          </div>
        </div>
        <div class="animate-fade-in-up delay-1">
          <ArtistGrid
            artists={$artists}
            tracks={$allTracks}
            onPlayArtist={(list) => void handlePlayFromCustomList(list, 0)}
          />
        </div>

      {:else if $currentView === 'playlists'}
        <div class="view-header animate-fade-in-up">
          <h1 class="view-title">Playlists</h1>
        </div>
        <div class="placeholder-view animate-fade-in-up delay-1">
          <GlassCard padding="lg">
            <p class="text-secondary">Playlist manager — coming in Phase 5</p>
          </GlassCard>
        </div>

      {:else if $currentView === 'favorites'}
        <div class="view-header animate-fade-in-up">
          <div class="view-title-section">
            <h1 class="view-title">Favorites</h1>
            <span class="view-count">{visibleFavorites.length} tracks</span>
          </div>
        </div>
        {#if visibleFavorites.length === 0}
          <div class="placeholder-view animate-fade-in-up delay-1">
            <GlassCard padding="lg" radius="2xl">
              <p class="text-secondary">No favorites yet — tap the heart on a track to add it here.</p>
            </GlassCard>
          </div>
        {:else}
          <div class="tracks-list animate-fade-in-up delay-1">
            <GlassCard padding="md" radius="2xl" class="tracks-card">
              <TrackList
                tracks={visibleFavorites}
                onPlay={(t, i) => void handlePlayFromCustomList(visibleFavorites, i)}
              />
            </GlassCard>
          </div>
        {/if}

      {:else if $currentView === 'recent'}
        <div class="view-header animate-fade-in-up">
          <div class="view-title-section">
            <h1 class="view-title">Recently Played</h1>
            <span class="view-count">{recentTracks.length} tracks</span>
          </div>
        </div>
        {#if recentTracks.length === 0}
          <div class="placeholder-view animate-fade-in-up delay-1">
            <GlassCard padding="lg" radius="2xl">
              <p class="text-secondary">Nothing here yet — play a track and it will show up in Recent.</p>
            </GlassCard>
          </div>
        {:else}
          <div class="tracks-list animate-fade-in-up delay-1">
            <GlassCard padding="md" radius="2xl" class="tracks-card">
              <TrackList
                tracks={recentTracks}
                onPlay={(t, i) => void handlePlayFromCustomList(recentTracks, i)}
              />
            </GlassCard>
          </div>
        {/if}
      {/if}
    </div>
  </main>

  <!-- Player Bar -->
  <div class="app-player">
    <PlayerBar />
  </div>
</div>

<!-- Overlays -->
<SettingsModal />
<NowPlaying />
<QueuePanel />

<style>
  /* ---- Ambient Background ---- */
  .ambient-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: -1;
  }

  .ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.12;
    animation: float 20s ease-in-out infinite;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
    top: -200px;
    right: -100px;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: hsl(calc(var(--accent-h) + 60), 80%, 55%);
    bottom: -150px;
    left: -100px;
    animation-delay: -7s;
  }

  .orb-3 {
    width: 300px;
    height: 300px;
    background: hsl(calc(var(--accent-h) + 120), 70%, 50%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -14s;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(30px, -20px) scale(1.05); }
    50% { transform: translate(-20px, 30px) scale(0.95); }
    75% { transform: translate(15px, 15px) scale(1.02); }
  }

  .app-content {
    position: relative;
  }

  /* Content inner */
  .content-inner {
    padding: var(--space-6);
    min-height: 100%;
    position: relative;
    z-index: 1;
  }

  /* View header */
  .view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  .view-title-section {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .view-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .view-count {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .view-actions {
    display: flex;
    gap: var(--space-2);
  }

  /* Scan status */
  .scan-status {
    margin-bottom: var(--space-4);
    max-width: 680px;
  }

  .scan-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .scan-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 220px;
  }

  .scan-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-primary);
    box-shadow: 0 0 18px var(--accent-glow-strong);
    animation: pulse-glow 2.4s ease-in-out infinite;
  }

  .scan-text {
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .scan-sub {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .scan-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .scan-bar {
    width: min(360px, 100%);
    height: 8px;
    border-radius: var(--radius-full);
    background: hsla(0, 0%, 100%, 0.06);
    border: 1px solid var(--glass-border);
    overflow: hidden;
  }

  .scan-bar-fill {
    height: 100%;
    background: var(--accent-gradient);
    box-shadow: 0 0 16px var(--accent-glow);
    transition: width var(--duration-fast) linear;
  }

  /* Track list wrapper */
  .tracks-list {
    height: calc(100vh - var(--titlebar-height) - var(--player-bar-height) - 160px);
    min-height: 420px;
  }

  .tracks-card {
    height: 100%;
  }

  /* Empty state */
  .empty-state {
    max-width: 560px;
    margin: var(--space-16) auto 0;
  }

  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-8) 0;
  }

  .empty-icon-container {
    position: relative;
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-8);
  }

  .empty-icon {
    position: relative;
    z-index: 1;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-gradient-subtle);
    border: 1px solid hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15);
  }

  .empty-icon-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.08);
  }

  .ring-1 {
    width: 100px;
    height: 100px;
    animation: breathe 4s ease-in-out infinite;
    animation-delay: 0s;
  }

  .ring-2 {
    width: 120px;
    height: 120px;
    animation: breathe 4s ease-in-out infinite;
    animation-delay: 0.5s;
  }

  .ring-3 {
    width: 140px;
    height: 140px;
    animation: breathe 4s ease-in-out infinite;
    animation-delay: 1s;
  }

  .empty-title {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-3);
    letter-spacing: -0.01em;
  }

  .empty-description {
    font-size: var(--text-md);
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: var(--space-8);
    max-width: 400px;
  }

  .empty-actions {
    margin-bottom: var(--space-8);
  }

  .supported-formats {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .format-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .format-tags {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    justify-content: center;
  }

  .format-tag {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: hsla(0, 0%, 100%, 0.04);
    border: 1px solid var(--glass-border);
    letter-spacing: 0.05em;
  }

  /* Placeholder views */
  .placeholder-view {
    max-width: 400px;
  }
</style>
