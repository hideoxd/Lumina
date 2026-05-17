<!--
  Titlebar — Custom window titlebar with drag region, search, and window controls
  Replaces native OS titlebar for premium feel
-->
<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Icon from '$lib/components/Icon.svelte';
  import { searchQuery, searchFocused, settingsOpen } from '$lib/stores/ui';
  import { activeTheme, toggleMode } from '$lib/stores/theme';
  import Button from '$lib/components/ui/Button.svelte';

  let isMaximized = $state(false);
  let searchInputEl: HTMLInputElement;

  const appWindow = getCurrentWindow();

  async function checkMaximized() {
    isMaximized = await appWindow.isMaximized();
  }

  async function handleMinimize() {
    await appWindow.minimize();
  }

  async function handleMaximize() {
    await appWindow.toggleMaximize();
    isMaximized = !isMaximized;
  }

  async function handleClose() {
    await appWindow.close();
  }

  function handleSearchFocus() {
    searchFocused.set(true);
  }

  function handleSearchBlur() {
    searchFocused.set(false);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchQuery.set('');
      searchInputEl?.blur();
    }
  }

  // Keyboard shortcut: Ctrl+F to focus search
  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInputEl?.focus();
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<header class="titlebar" data-tauri-drag-region>
  <!-- Left: App logo & name -->
  <div class="titlebar-left">
    <div class="app-logo">
      <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="tbLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="hsl(var(--accent-h), var(--accent-s), var(--accent-l))" />
            <stop offset="100%" stop-color="hsl(calc(var(--accent-h) + 50), 90%, 60%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Outer ring -->
        <circle cx="32" cy="32" r="28" stroke="url(#tbLogoGrad)" stroke-width="2" fill="none" opacity="0.4" />
        <!-- Middle ring -->
        <circle cx="32" cy="32" r="20" stroke="url(#tbLogoGrad)" stroke-width="1.5" fill="none" opacity="0.6" />
        <!-- Inner circle with glow -->
        <circle cx="32" cy="32" r="14" fill="url(#tbLogoGrad)" opacity="0.85" filter="url(#glow)" />
        <!-- Play triangle -->
        <path d="M27 23L42 32L27 41Z" fill="white" opacity="0.95" />
      </svg>
    </div>
    <span class="app-name">Lumina</span>
  </div>

  <!-- Center: Search bar -->
  <div class="titlebar-center" data-tauri-drag-region>
    <div class="search-container" class:focused={$searchFocused}>
      <Icon name="search" size={14} color="var(--text-tertiary)" />
      <input
        type="text"
        class="search-input"
        placeholder="Search your library..."
        bind:value={$searchQuery}
        bind:this={searchInputEl}
        onfocus={handleSearchFocus}
        onblur={handleSearchBlur}
        onkeydown={handleSearchKeydown}
      />
      {#if $searchQuery}
        <button class="search-clear" onclick={() => searchQuery.set('')}>
          <Icon name="x" size={12} />
        </button>
      {/if}
      <kbd class="search-shortcut">⌘F</kbd>
    </div>
  </div>

  <!-- Right: Controls -->
  <div class="titlebar-right">
    <!-- Theme toggle -->
    <Button variant="icon" size="sm" title="Toggle theme" onclick={() => toggleMode()}>
      <Icon name={$activeTheme.mode === 'dark' ? 'sun' : 'moon'} size={15} />
    </Button>

    <!-- Settings -->
    <Button variant="icon" size="sm" title="Settings" onclick={() => settingsOpen.update(v => !v)}>
      <Icon name="settings" size={15} />
    </Button>

    <!-- Window controls (separated) -->
    <div class="window-controls">
      <button class="win-btn win-minimize" onclick={handleMinimize} title="Minimize">
        <Icon name="minus" size={14} />
      </button>
      <button class="win-btn win-maximize" onclick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
        <Icon name="maximize" size={12} />
      </button>
      <button class="win-btn win-close" onclick={handleClose} title="Close">
        <Icon name="x" size={14} />
      </button>
    </div>
  </div>
</header>

<style>
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 16px;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    -webkit-app-region: drag;
    position: relative;
    z-index: 100;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 160px;
    -webkit-app-region: no-drag;
  }

  .app-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  .app-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-primary);
  }

  /* Search */
  .titlebar-center {
    flex: 1;
    max-width: 420px;
    display: flex;
    justify-content: center;
    -webkit-app-region: no-drag;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 28px;
    padding: 0 var(--space-3);
    background: hsla(0, 0%, 100%, 0.04);
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    transition:
      background var(--duration-fast) ease,
      border-color var(--duration-fast) ease,
      box-shadow var(--duration-normal) ease;
  }

  .search-container.focused {
    background: hsla(0, 0%, 100%, 0.08);
    border-color: var(--glass-border-hover);
    box-shadow: 0 0 0 3px hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.1);
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--text-primary);
    -webkit-app-region: no-drag;
  }

  .search-input::placeholder {
    color: var(--text-tertiary);
  }

  .search-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: hsla(0, 0%, 100%, 0.1);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background var(--duration-fast) ease;
  }

  .search-clear:hover {
    background: hsla(0, 0%, 100%, 0.2);
  }

  .search-shortcut {
    font-size: 9px;
    font-family: var(--font-sans);
    font-weight: 500;
    color: var(--text-tertiary);
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--glass-border);
    background: hsla(0, 0%, 100%, 0.03);
    white-space: nowrap;
    pointer-events: none;
  }

  /* Right section */
  .titlebar-right {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 160px;
    justify-content: flex-end;
    -webkit-app-region: no-drag;
  }

  /* Window controls */
  .window-controls {
    display: flex;
    align-items: center;
    margin-left: var(--space-2);
  }

  .win-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: var(--titlebar-height);
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .win-btn:hover {
    background: hsla(0, 0%, 100%, 0.06);
    color: var(--text-primary);
  }

  .win-close:hover {
    background: hsla(0, 80%, 50%, 0.8);
    color: white;
  }
</style>
