<!--
  Sidebar — Navigation sidebar with glass styling and animated active states
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
  import { currentView, sidebarCollapsed, navItems, navigateTo, toggleSidebar } from '$lib/stores/ui';
  import { trackCount } from '$lib/stores/library';
  import type { ViewMode } from '$lib/types';
  import { addMusicFolderWithDialog } from '$lib/controllers/library';

  function handleNavClick(view: ViewMode) {
    navigateTo(view);
  }

  async function handleAddFolder() {
    await addMusicFolderWithDialog();
  }
</script>

<aside class="sidebar" class:collapsed={$sidebarCollapsed}>
  <!-- Library section -->
  <div class="sidebar-section">
    <div class="section-header">
      <span class="section-label">LIBRARY</span>
      <span class="track-badge">{$trackCount}</span>
    </div>

    <nav class="nav-list">
      {#each navItems as item, i}
        <button
          class="nav-item"
          class:active={$currentView === item.view}
          onclick={() => handleNavClick(item.view)}
          title={item.label}
          style="animation-delay: {i * 40}ms"
        >
          <div class="nav-icon">
            <Icon name={item.icon} size={18} />
          </div>
          {#if !$sidebarCollapsed}
            <span class="nav-label">{item.label}</span>
          {/if}
          {#if item.badge && !$sidebarCollapsed}
            <span class="nav-badge">{item.badge}</span>
          {/if}

          <!-- Active indicator -->
          {#if $currentView === item.view}
            <div class="active-indicator"></div>
          {/if}
        </button>
      {/each}
    </nav>
  </div>

  <!-- Actions section -->
  <div class="sidebar-section">
    <div class="section-header">
      <span class="section-label">ACTIONS</span>
    </div>

    <button class="nav-item action-item" title="Add Folder" onclick={handleAddFolder}>
      <div class="nav-icon">
        <Icon name="folder-plus" size={18} />
      </div>
      {#if !$sidebarCollapsed}
        <span class="nav-label">Add Folder</span>
      {/if}
    </button>

    <button class="nav-item action-item" title="Create Playlist">
      <div class="nav-icon">
        <Icon name="plus" size={18} />
      </div>
      {#if !$sidebarCollapsed}
        <span class="nav-label">New Playlist</span>
      {/if}
    </button>
  </div>

  <!-- Playlists section (placeholder) -->
  <div class="sidebar-section playlists-section">
    <div class="section-header">
      <span class="section-label">PLAYLISTS</span>
    </div>

    <div class="empty-playlists">
      {#if !$sidebarCollapsed}
        <p class="empty-text">No playlists yet</p>
        <p class="empty-hint">Create one to get started</p>
      {/if}
    </div>
  </div>

  <!-- Collapse toggle -->
  <div class="sidebar-footer">
    <GlassButton variant="icon" size="sm" title={$sidebarCollapsed ? 'Expand' : 'Collapse'} onclick={toggleSidebar}>
      <Icon name={$sidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
    </GlassButton>
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    height: 100%;
    background: hsla(225, 15%, 8%, 0.5);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    border-right: 1px solid var(--glass-border);
    padding: var(--space-3) 0;
    overflow-y: auto;
    overflow-x: hidden;
    transition: width var(--duration-slow) var(--ease-out-expo);
  }

  :global([data-theme="light"]) .sidebar {
    background: hsla(225, 15%, 96%, 0.6);
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  /* Sections */
  .sidebar-section {
    padding: 0 var(--space-3);
    margin-bottom: var(--space-4);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-3);
    margin-bottom: var(--space-2);
    min-height: 24px;
  }

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-tertiary);
    text-transform: uppercase;
  }

  .collapsed .section-label {
    display: none;
  }

  .track-badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: hsla(0, 0%, 100%, 0.06);
  }

  .collapsed .track-badge {
    display: none;
  }

  /* Navigation */
  .nav-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    height: 36px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 500;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      color var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart);
    animation: fadeInUp var(--duration-slow) var(--ease-out-expo) both;
  }

  .collapsed .nav-item {
    justify-content: center;
    padding: 0;
  }

  .nav-item:hover {
    background: hsla(0, 0%, 100%, 0.04);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent-gradient-subtle);
    color: var(--accent-primary);
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .nav-label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent-primary);
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    border-radius: var(--radius-full);
    background: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.12);
  }

  /* Active indicator bar */
  .active-indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    border-radius: 0 3px 3px 0;
    background: var(--accent-gradient);
    box-shadow: 0 0 8px var(--accent-glow);
    animation: fadeIn var(--duration-normal) var(--ease-out-quart);
  }

  /* Action items */
  .action-item {
    color: var(--text-tertiary);
  }

  .action-item:hover {
    color: var(--text-primary);
  }

  /* Playlists */
  .playlists-section {
    flex: 1;
    overflow-y: auto;
  }

  .empty-playlists {
    padding: var(--space-3);
    text-align: center;
  }

  .empty-text {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    margin-bottom: 2px;
  }

  .empty-hint {
    font-size: var(--text-xs);
    color: var(--text-disabled);
  }

  /* Footer */
  .sidebar-footer {
    padding: var(--space-2) var(--space-3);
    display: flex;
    justify-content: center;
    border-top: 1px solid var(--glass-border);
    margin-top: auto;
  }
</style>
