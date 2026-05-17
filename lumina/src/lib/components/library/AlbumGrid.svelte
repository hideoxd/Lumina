<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import type { Album, Track } from '$lib/types';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { searchQuery } from '$lib/stores/ui';

  export interface Props {
    albums: Album[];
    tracks: Track[];
    onPlayAlbum?: (albumTracks: Track[]) => void;
  }

  let { albums, tracks, onPlayAlbum }: Props = $props();

  const artworkCache = new Map<string, string>();

  async function ensureArtworkUrl(filename: string): Promise<string> {
    const cached = artworkCache.get(filename);
    if (cached) return cached;
    const url = await getArtworkUrl(filename);
    artworkCache.set(filename, url);
    return url;
  }

  function getAlbumTracks(album: Album): Track[] {
    const key = album.id;
    const list = tracks.filter((t) => `${t.album}::${t.album_artist ?? t.artist}` === key);
    return [...list].sort((a, b) => {
      const d = (a.disc_number ?? 0) - (b.disc_number ?? 0);
      if (d !== 0) return d;
      const tn = (a.track_number ?? 0) - (b.track_number ?? 0);
      if (tn !== 0) return tn;
      return a.title.localeCompare(b.title);
    });
  }

  let filtered = $derived(
    (() => {
      const q = $searchQuery.trim().toLowerCase();
      if (!q) return albums;
      return albums.filter((a) => `${a.title} ${a.artist}`.toLowerCase().includes(q));
    })()
  );
</script>

<div class="grid stagger-enter">
  {#if filtered.length === 0}
    <Card padding="lg" radius="2xl">
      <p class="empty">No albums match your search.</p>
    </Card>
  {:else}
    {#each filtered as album, idx (album.id)}
      <Card
        padding="md"
        radius="2xl"
        class="album hover-lift"
        style="animation-delay: {idx * 40}ms"
        onclick={() => {
          /* reserved for album detail later */
        }}
        ondblclick={() => onPlayAlbum?.(getAlbumTracks(album))}
      >
        <div class="art">
          {#if album.artwork_path}
            {#await ensureArtworkUrl(album.artwork_path)}
              <div class="art-placeholder">
                <Icon name="disc" size={20} color="var(--text-tertiary)" />
              </div>
            {:then url}
              <img src={url} alt="" loading="lazy" />
            {:catch}
              <div class="art-placeholder">
                <Icon name="disc" size={20} color="var(--text-tertiary)" />
              </div>
            {/await}
          {:else}
            <div class="art-placeholder">
              <Icon name="disc" size={20} color="var(--text-tertiary)" />
            </div>
          {/if}
        </div>

        <div class="meta">
          <div class="title truncate" title={album.title}>{album.title}</div>
          <div class="sub truncate" title={album.artist}>{album.artist}</div>
          <div class="count">{album.track_count} tracks</div>
        </div>
      </Card>
    {/each}
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-4);
  }

  :global(.album) {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    cursor: default;
    min-width: 0;
    transition:
      transform var(--duration-normal) var(--ease-out-quart),
      box-shadow var(--duration-normal) ease;
  }

  :global(.album:hover) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
  }

  .art {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-xl);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    background: var(--bg-tertiary);
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .art-placeholder {
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

  .title {
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .sub {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .count {
    margin-top: 4px;
    color: var(--text-tertiary);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .empty {
    color: var(--text-tertiary);
  }
</style>
