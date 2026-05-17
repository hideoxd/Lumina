<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { currentView, navigateTo } from '$lib/stores/ui';
  import { playlists, selectPlaylist } from '$lib/stores/playlists';
  import type { ViewMode } from '$lib/types';

  function handleNavClick(view: ViewMode) {
    selectPlaylist(null);
    navigateTo(view);
  }

  function handlePlaylistClick(playlistId: string) {
    const pl = $playlists.find(p => p.id === playlistId);
    if (pl) selectPlaylist(pl);
    navigateTo('playlists');
  }

  const navItems = [
    { id: 'tracks', label: 'All Tracks', icon: 'music', view: 'tracks' as ViewMode },
    { id: 'albums', label: 'Albums', icon: 'disc', view: 'albums' as ViewMode },
    { id: 'artists', label: 'Artists', icon: 'users', view: 'artists' as ViewMode },
    { id: 'youtube', label: 'YouTube', icon: 'download', view: 'youtube' as ViewMode }
  ];
</script>

<aside class="sidebar">
  <div class="sidebar-top">
    <div class="brand">
      <div class="brand-icon"><Icon name="music" size={16} color="var(--bg-primary)" /></div>
      <span class="brand-text">Lumina</span>
    </div>

    <div class="sidebar-section">
      <span class="section-label">Library</span>
      <nav class="nav-list">
        {#each navItems as item}
          <button
            class="nav-item"
            class:active={$currentView === item.view}
            onclick={() => handleNavClick(item.view)}
          >
            <Icon name={item.icon} size={16} />
            <span class="nav-label">{item.label}</span>
          </button>
        {/each}
      </nav>
    </div>

    <div class="sidebar-section playlists-section">
      <span class="section-label">Playlists</span>
      <nav class="nav-list">
        <button class="nav-item" class:active={$currentView === 'favorites'} onclick={() => handleNavClick('favorites')}>
          <Icon name="heart" size={16} />
          <span class="nav-label">Favorites</span>
        </button>
        
        {#each $playlists as pl}
          <button
            class="nav-item"
            class:active={$currentView === 'playlists'}
            onclick={() => handlePlaylistClick(pl.id)}
          >
            <Icon name="list" size={16} />
            <span class="nav-label truncate">{pl.name}</span>
          </button>
        {/each}
      </nav>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 240px;
    height: 100%;
    background: var(--bg-primary);
    border-right: 1px solid var(--bg-elevated);
    overflow: hidden;
  }

  .sidebar-top {
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    gap: 32px;
    overflow-y: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 8px;
  }

  .brand-icon {
    width: 24px;
    height: 24px;
    background: var(--text-primary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-text {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 8px;
  }

  .nav-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: all 0.1s ease;
  }

  .nav-item:hover {
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  .nav-item.active {
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-weight: 500;
  }

  .nav-label {
    font-size: 13px;
  }
</style>
