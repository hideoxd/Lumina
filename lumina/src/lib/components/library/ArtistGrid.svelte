<script lang="ts">
  import GlassCard from '$lib/components/glass/GlassCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import type { Artist, Track } from '$lib/types';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { searchQuery } from '$lib/stores/ui';

  export interface Props {
    artists: Artist[];
    tracks: Track[];
    onPlayArtist?: (artistTracks: Track[]) => void;
  }

  let { artists, tracks, onPlayArtist }: Props = $props();

  const artworkCache = new Map<string, string>();

  async function ensureArtworkUrl(filename: string): Promise<string> {
    const cached = artworkCache.get(filename);
    if (cached) return cached;
    const url = await getArtworkUrl(filename);
    artworkCache.set(filename, url);
    return url;
  }

  function getArtistTracks(artist: Artist): Track[] {
    const list = tracks.filter((t) => (t.artist || 'Unknown Artist') === artist.name);
    return [...list].sort((a, b) => {
      const aa = (a.album || '').localeCompare(b.album || '');
      if (aa !== 0) return aa;
      const tn = (a.track_number ?? 0) - (b.track_number ?? 0);
      if (tn !== 0) return tn;
      return a.title.localeCompare(b.title);
    });
  }

  let filtered = $derived(
    (() => {
      const q = $searchQuery.trim().toLowerCase();
      if (!q) return artists;
      return artists.filter((a) => a.name.toLowerCase().includes(q));
    })()
  );
</script>

<div class="grid">
  {#if filtered.length === 0}
    <GlassCard padding="lg" radius="2xl">
      <p class="empty">No artists match your search.</p>
    </GlassCard>
  {:else}
    {#each filtered as artist (artist.id)}
      <GlassCard
        padding="md"
        radius="2xl"
        class="artist"
        ondblclick={() => onPlayArtist?.(getArtistTracks(artist))}
      >
        <div class="row">
          <div class="avatar">
            {#if artist.artwork_path}
              {#await ensureArtworkUrl(artist.artwork_path)}
                <div class="avatar-placeholder">
                  <Icon name="users" size={18} color="var(--text-tertiary)" />
                </div>
              {:then url}
                <img src={url} alt="" loading="lazy" />
              {:catch}
                <div class="avatar-placeholder">
                  <Icon name="users" size={18} color="var(--text-tertiary)" />
                </div>
              {/await}
            {:else}
              <div class="avatar-placeholder">
                <Icon name="users" size={18} color="var(--text-tertiary)" />
              </div>
            {/if}
          </div>

          <div class="meta">
            <div class="name truncate" title={artist.name}>{artist.name}</div>
            <div class="sub">
              <span>{artist.album_count} albums</span>
              <span class="dot">•</span>
              <span>{artist.track_count} tracks</span>
            </div>
          </div>
        </div>
      </GlassCard>
    {/each}
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
  }

  :global(.artist) {
    cursor: default;
    transition:
      transform var(--duration-normal) var(--ease-out-quart),
      box-shadow var(--duration-normal) ease;
  }

  :global(.artist:hover) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid var(--glass-border);
    background: var(--bg-tertiary);
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .name {
    font-weight: 850;
    letter-spacing: -0.01em;
  }

  .sub {
    color: var(--text-tertiary);
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    opacity: 0.45;
  }

  .empty {
    color: var(--text-tertiary);
  }
</style>
