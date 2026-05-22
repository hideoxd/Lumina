<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { searchQuery, searchFocused } from '$lib/stores/ui';

  let searchInputEl: HTMLInputElement;
  let isMaximized = $state(false);

  let winApi: any = null;

  async function ensureWinApi() {
    if (winApi) return winApi;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      winApi = getCurrentWindow;
      return winApi;
    } catch {
      return null;
    }
  }

  async function handleMinimize() {
    const api = await ensureWinApi();
    if (!api) return;
    try { await api().minimize(); } catch {}
  }

  async function handleMaximize() {
    const api = await ensureWinApi();
    if (!api) return;
    try {
      await api().toggleMaximize();
      isMaximized = await api().isMaximized();
    } catch {}
  }

  async function handleClose() {
    const api = await ensureWinApi();
    if (!api) return;
    try { await api().close(); } catch {}
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
  <div class="titlebar-left">
    <span class="app-brand">Lumina</span>
  </div>

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
        <Icon name="minus" size={12} />
      </button>
      <button class="win-btn" onclick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
        <Icon name={isMaximized ? 'minimize' : 'maximize'} size={12} />
      </button>
      <button class="win-btn win-close" onclick={handleClose} title="Close">
        <Icon name="x" size={13} />
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
    position: relative;
    z-index: 100;
  }

  .titlebar-left {
    min-width: 80px;
    display: flex;
    align-items: center;
  }

  .app-brand {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .titlebar-center {
    flex: 1;
    max-width: 320px;
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
    min-width: auto;
    gap: 4px;
  }

  .window-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .win-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .win-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .win-close:hover {
    background: rgba(220, 38, 38, 0.2);
    color: #ef4444;
  }
</style>
