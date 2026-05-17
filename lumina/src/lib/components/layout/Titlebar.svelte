<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Icon from '$lib/components/Icon.svelte';
  import { searchQuery, searchFocused } from '$lib/stores/ui';

  let isMaximized = $state(false);
  let searchInputEl: HTMLInputElement;

  const appWindow = getCurrentWindow();

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

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchQuery.set('');
      searchInputEl?.blur();
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInputEl?.focus();
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<header class="titlebar" data-tauri-drag-region>
  <div class="titlebar-left" data-tauri-drag-region></div>

  <div class="titlebar-center">
    <div class="search-box" class:focused={$searchFocused}>
      <Icon name="search" size={14} color="var(--text-tertiary)" />
      <input
        type="text"
        class="search-input"
        placeholder="Search..."
        bind:value={$searchQuery}
        bind:this={searchInputEl}
        onfocus={() => searchFocused.set(true)}
        onblur={() => searchFocused.set(false)}
        onkeydown={handleSearchKeydown}
      />
      {#if $searchQuery}
        <button class="search-clear" onclick={() => searchQuery.set('')}>
          <Icon name="x" size={10} />
        </button>
      {/if}
    </div>
  </div>

  <div class="titlebar-right">
    <div class="window-controls">
      <button class="win-btn" onclick={handleMinimize} title="Minimize">
        <Icon name="minus" size={14} />
      </button>
      <button class="win-btn" onclick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
        <Icon name="maximize" size={11} />
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
    padding: 0 8px 0 16px;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    -webkit-app-region: drag;
    position: relative;
    z-index: 100;
  }

  .titlebar-left {
    min-width: 80px;
  }

  .titlebar-center {
    flex: 1;
    max-width: 320px;
    -webkit-app-region: no-drag;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid transparent;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .search-box.focused {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 13px;
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
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 120px;
    -webkit-app-region: no-drag;
  }

  .window-controls {
    display: flex;
    align-items: center;
  }

  .win-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 48px;
    color: var(--text-tertiary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.1s;
  }

  .win-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
  }

  .win-close:hover {
    background: rgba(220, 38, 38, 0.8);
    color: white;
  }
</style>
