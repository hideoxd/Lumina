<script lang="ts">
  import type { Playlist } from '$lib/types';
  import Icon from '$lib/components/Icon.svelte';
  import GlassCard from '$lib/components/glass/GlassCard.svelte';

  let { playlists, onSelect }: { playlists: Playlist[]; onSelect: (playlist: Playlist) => void } = $props();

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  }
</script>

<div class="playlist-grid stagger-enter">
  {#each playlists as pl, idx}
    <button
      class="playlist-card glass hover-lift"
      style="animation: fadeInUp 400ms var(--ease-out-expo) both; animation-delay: {idx * 50}ms"
      onclick={() => onSelect(pl)}>
      <div class="art">
        {#if pl.artwork_path}
          <img src={pl.artwork_path} alt="" />
        {:else}
          <div class="art-placeholder">
            <Icon name="list" size={32} color="var(--accent-primary)" />
          </div>
        {/if}
      </div>
      <div class="info">
        <div class="name truncate">{pl.name}</div>
        <div class="meta">
          <span>{pl.track_count} tracks</span>
          {#if pl.total_duration > 0}
            <span class="dot">·</span>
            <span>{formatDuration(pl.total_duration)}</span>
          {/if}
          {#if pl.is_smart}
            <span class="smart-badge">Smart</span>
          {/if}
        </div>
      </div>
    </button>
  {/each}
</div>

<style>
  .playlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  .playlist-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-xl);
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    padding: 0;
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
    transition:
      transform var(--duration-normal) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart),
      border-color var(--duration-normal) var(--ease-out-quart);
  }

  .playlist-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    border-color: var(--glass-border-hover);
  }

  .playlist-card:active {
    transform: translateY(-1px) scale(0.99);
  }

  .art {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--bg-tertiary);
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-gradient-subtle);
  }

  .info {
    padding: var(--space-3) var(--space-4);
  }

  .name {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .meta {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dot {
    opacity: 0.5;
  }

  .smart-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15);
    color: var(--accent-primary);
  }
</style>
