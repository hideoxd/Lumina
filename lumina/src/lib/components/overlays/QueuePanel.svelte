<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';

  import { queuePanelOpen } from '$lib/stores/ui';
  import { queueState, playQueueIndex } from '$lib/stores/queue';

  function close() {
    queuePanelOpen.set(false);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return;
    close();
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close();
    }
  }

  function removeFromQueue(index: number) {
    queueState.update(qs => {
      const newTracks = qs.tracks.filter((_, i) => i !== index);
      let newIndex = qs.currentIndex;
      if (index < qs.currentIndex) {
        newIndex = qs.currentIndex - 1;
      } else if (index === qs.currentIndex) {
        newIndex = -1; // currently playing removed
      }
      return { ...qs, tracks: newTracks, currentIndex: newIndex >= newTracks.length ? -1 : newIndex };
    });
  }
</script>

{#if $queuePanelOpen}
  <div
    class="backdrop"
    role="button"
    tabindex="0"
    aria-label="Close queue"
    transition:fade={{ duration: 200 }}
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div class="panel" role="dialog" aria-modal="true" aria-label="Queue" transition:fly={{ duration: 250, x: 40, opacity: 0 }}>
      <Card padding="lg" radius="2xl" class="surface">
        <div class="header">
          <div class="title">
            <Icon name="queue" size={16} />
            <span>Queue</span>
            <span class="count">{$queueState.tracks.length}</span>
          </div>

          <Button variant="icon" size="sm" title="Close" onclick={close}>
            <Icon name="x" size={16} />
          </Button>
        </div>

        <div class="list" role="list">
          {#if $queueState.tracks.length === 0}
            <div class="empty">
              <p class="empty-title">Queue is empty</p>
              <p class="empty-sub">Play a track to start a queue.</p>
            </div>
          {:else}
            {#each $queueState.tracks as t, i (t.id)}
              <div
                class="item"
                class:active={i === $queueState.currentIndex}
                role="button"
                tabindex="0"
                onclick={() => void playQueueIndex(i)}
                onkeydown={(e) => { if (e.key === 'Enter') void playQueueIndex(i); }}
                title="Play"
              >
                <span class="idx">{i + 1}</span>
                <span class="name truncate">{t.title}</span>
                <span class="artist truncate">{t.artist}</span>
                <button
                  class="item-remove"
                  title="Remove from queue"
                  onclick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); removeFromQueue(i); } }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            {/each}
          {/if}
        </div>
      </Card>
      </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: hsla(0, 0%, 0%, 0.35);
  }

  .panel {
    position: absolute;
    top: var(--titlebar-height);
    right: 0;
    bottom: var(--player-bar-height);
    width: min(420px, 92vw);
    padding: var(--space-4);
  }

  :global(.surface) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--glass-border);
  }

  .title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .count {
    font-size: 10px;
    color: var(--text-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
    padding: 2px 8px;
    margin-left: var(--space-1);
  }

  .list {
    padding-top: var(--space-3);
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item {
    display: grid;
    grid-template-columns: 34px 1fr 0.8fr 28px;
    gap: var(--space-3);
    align-items: center;
    height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-lg);
    border: 1px solid transparent;
    color: var(--text-secondary);
    background: transparent;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart),
      color var(--duration-fast) var(--ease-out-quart);
  }

  .item:hover {
    background: hsla(0, 0%, 100%, 0.04);
    border-color: hsla(0, 0%, 100%, 0.06);
    color: var(--text-primary);
  }

  .item.active {
    background: var(--accent-gradient-subtle);
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.22);
    color: var(--accent-primary);
  }

  .item-remove {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    opacity: 0;
    transition: all 0.12s ease;
    flex-shrink: 0;
  }

  .item:hover .item-remove,
  .item-remove:focus-visible {
    opacity: 0.6;
  }

  .item-remove:hover {
    opacity: 1 !important;
    background: rgba(255, 255, 255, 0.1);
    color: #ef4444;
  }

  .idx {
    font-size: 10px;
    color: var(--text-tertiary);
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .name {
    font-weight: 700;
    color: var(--text-primary);
    min-width: 0;
  }

  .artist {
    font-size: 11px;
    color: var(--text-tertiary);
    text-align: right;
    min-width: 0;
  }

  .empty {
    padding: var(--space-6);
    text-align: center;
  }

  .empty-title {
    font-weight: 900;
    margin-bottom: 6px;
  }

  .empty-sub {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }
</style>
