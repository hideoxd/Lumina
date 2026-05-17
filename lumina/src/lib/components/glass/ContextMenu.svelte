<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import type { MenuItem } from '$lib/types';

  let {
    items,
    x,
    y,
    onClose,
  }: {
    items: MenuItem[];
    x: number;
    y: number;
    onClose: () => void;
  } = $props();

  let menuEl: HTMLDivElement;
  let menuRect = $state<DOMRect | null>(null);
  let hoveredSubmenu = $state<string | null>(null);

  let adjustedX = $derived.by(() => {
    if (!menuRect) return x;
    const { innerWidth } = window;
    if (x + menuRect.width > innerWidth - 8) return innerWidth - menuRect.width - 8;
    return x;
  });

  let adjustedY = $derived.by(() => {
    if (!menuRect) return y;
    const { innerHeight } = window;
    if (y + menuRect.height > innerHeight - 8) return innerHeight - menuRect.height - 8;
    return y;
  });

  $effect(() => {
    if (!menuEl) return;
    menuRect = menuEl.getBoundingClientRect();
  });

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return;
    if (item.children) return; // submenu parent — don't close
    item.onclick?.();
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleBackdropClick} oncontextmenu={(e) => { e.preventDefault(); onClose(); }} />

<div
  class="context-menu-backdrop"
  onclick={handleBackdropClick}
  oncontextmenu={(e) => e.preventDefault()}
  role="presentation"
>
  <div
    class="context-menu glass"
    bind:this={menuEl}
    style="left: {adjustedX}px; top: {adjustedY}px;"
    role="menu"
    tabindex={-1}
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    {#each items as item}
      {#if item.divider}
        <div class="divider"></div>
      {:else}
        <div
          class="menu-item-wrapper"
          role="group"
          onmouseenter={() => { if (item.children) hoveredSubmenu = item.id; }}
          onmouseleave={() => { if (item.children) hoveredSubmenu = null; }}
        >
          <button
            class="menu-item"
            class:danger={item.danger}
            class:disabled={item.disabled}
            class:has-children={!!item.children}
            disabled={item.disabled}
            role="menuitem"
            onclick={() => handleItemClick(item)}
          >
            {#if item.icon}
              <span class="item-icon">
                <Icon name={item.icon} size={14} />
              </span>
            {:else}
              <span class="item-icon-placeholder"></span>
            {/if}
            <span class="item-label">{item.label}</span>
            {#if item.shortcut}
              <span class="item-shortcut">{item.shortcut}</span>
            {/if}
            {#if item.children}
              <span class="item-arrow">
                <Icon name="chevron-right" size={12} />
              </span>
            {/if}
          </button>

          <!-- Submenu -->
          {#if item.children && hoveredSubmenu === item.id}
            <div class="submenu glass">
              {#each item.children as child}
                {#if child.divider}
                  <div class="divider"></div>
                {:else}
                  <button
                    class="menu-item"
                    class:danger={child.danger}
                    class:disabled={child.disabled}
                    disabled={child.disabled}
                    role="menuitem"
                    onclick={() => { child.onclick?.(); onClose(); }}
                  >
                    {#if child.icon}
                      <span class="item-icon">
                        <Icon name={child.icon} size={14} />
                      </span>
                    {:else}
                      <span class="item-icon-placeholder"></span>
                    {/if}
                    <span class="item-label">{child.label}</span>
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .context-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-tooltip);
  }

  .context-menu {
    position: absolute;
    min-width: 220px;
    max-width: 300px;
    padding: 6px;
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    background: hsla(225, 18%, 10%, 0.92);
    backdrop-filter: blur(32px) saturate(1.6);
    -webkit-backdrop-filter: blur(32px) saturate(1.6);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    animation: fadeInScale var(--duration-fast) var(--ease-out-expo) both;
    transform-origin: top left;
    overflow: visible;
    z-index: var(--z-tooltip);
  }

  .context-menu::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      hsla(0, 0%, 100%, 0.06) 0%,
      transparent 50%
    );
    pointer-events: none;
  }

  :global([data-theme="light"]) .context-menu {
    background: hsla(225, 18%, 96%, 0.92);
    border-color: hsla(0, 0%, 0%, 0.08);
  }

  .menu-item-wrapper {
    position: relative;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      color var(--duration-fast) var(--ease-out-quart),
      transform var(--duration-fast) var(--ease-out-back);
    position: relative;
    z-index: 1;
  }

  .menu-item:hover:not(.disabled) {
    background: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.12);
    color: var(--accent-primary);
    transform: translateX(4px);
  }

  .menu-item:active:not(.disabled) {
    transform: scale(0.98);
  }

  .menu-item.danger {
    color: var(--error);
  }

  .menu-item.danger:hover {
    background: hsla(0, 72%, 58%, 0.12);
  }

  .menu-item.disabled {
    opacity: 0.35;
    cursor: default;
  }

  .item-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-icon-placeholder {
    width: 20px;
    flex-shrink: 0;
  }

  .item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-shortcut {
    font-size: 10px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
    padding: 1px 5px;
    border-radius: var(--radius-xs);
    background: hsla(0, 0%, 100%, 0.04);
    flex-shrink: 0;
  }

  .item-arrow {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }

  .divider {
    height: 1px;
    margin: 4px 8px;
    background: var(--glass-border);
  }

  /* Submenu */
  .submenu {
    position: absolute;
    left: 100%;
    top: -6px;
    min-width: 180px;
    max-width: 260px;
    max-height: 280px;
    overflow-y: auto;
    padding: 6px;
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    background: hsla(225, 18%, 10%, 0.92);
    backdrop-filter: blur(32px) saturate(1.6);
    -webkit-backdrop-filter: blur(32px) saturate(1.6);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    animation: fadeInScale var(--duration-fast) var(--ease-out-expo) both;
    transform-origin: top left;
    z-index: 1;
    margin-left: 4px;
  }

  :global([data-theme="light"]) .submenu {
    background: hsla(225, 18%, 96%, 0.92);
    border-color: hsla(0, 0%, 0%, 0.08);
  }

  .submenu::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      hsla(0, 0%, 100%, 0.06) 0%,
      transparent 50%
    );
    pointer-events: none;
  }
</style>
