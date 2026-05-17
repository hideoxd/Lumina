<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import type { Track, MenuItem } from '$lib/types';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { setTrackFavorite } from '$lib/commands/library';
  import { patchTrack } from '$lib/stores/library';
  import { setQueue, playQueueIndex } from '$lib/stores/queue';
  import { playlists, refreshPlaylists } from '$lib/stores/playlists';
  import { addTrackToPlaylist, removeTrackFromPlaylist } from '$lib/commands/library';
  import EditMetadataModal from '$lib/components/overlays/EditMetadataModal.svelte';

  let { tracks, onPlay, playlistId }: { tracks: Track[]; onPlay?: (track: Track, index: number) => void; playlistId?: string } = $props();

  const rowHeight = 52;
  let viewportEl: HTMLDivElement;
  let viewportHeight = $state(600);
  let scrollTop = $state(0);

  let startIndex = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - 8));
  let endIndex = $derived(
    Math.min(tracks.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 8)
  );

  let offsetTop = $derived(startIndex * rowHeight);
  let totalHeight = $derived(tracks.length * rowHeight);

  let contextMenu = $state<{ x: number; y: number; track: Track; index: number } | null>(null);
  let editMetadataTrack = $state<Track | null>(null);
  let showEditMetadata = $state(false);

  const artworkCache = new Map<string, string>();

  async function ensureArtworkUrl(filename: string): Promise<string> {
    const cached = artworkCache.get(filename);
    if (cached) return cached;
    const url = await getArtworkUrl(filename);
    artworkCache.set(filename, url);
    return url;
  }

  function handleScroll() {
    if (!viewportEl) return;
    scrollTop = viewportEl.scrollTop;
  }

  function handleResize() {
    if (!viewportEl) return;
    viewportHeight = viewportEl.clientHeight;
  }

  async function toggleFavorite(track: Track) {
    const next = !track.favorite;
    patchTrack(track.id, { favorite: next });
    try {
      await setTrackFavorite(track.id, next);
    } catch {
      patchTrack(track.id, { favorite: !next });
    }
  }

  function handleContextMenu(e: MouseEvent, track: Track, index: number) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, track, index };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function getContextMenuItems(track: Track, index: number): MenuItem[] {
    const items: MenuItem[] = [
      { id: 'play', label: 'Play', icon: 'play', onclick: () => onPlay?.(track, index) },
      { id: 'play-next', label: 'Play Next', icon: 'skip-forward', onclick: () => {} },
      { id: 'add-to-queue', label: 'Add to Queue', icon: 'queue', onclick: () => {
        setQueue(tracks, index);
      }},
      { id: 'divider1', divider: true },
    ];

    const playlistItems = $playlists.map(pl => ({
      id: pl.id,
      label: pl.name,
      onclick: () => { void addTrackToPlaylist(pl.id, track.id).then(() => refreshPlaylists()); }
    } as MenuItem));

    if (playlistItems.length > 0) {
      items.push({ id: 'add-to-playlist', label: 'Add to Playlist', icon: 'plus', children: playlistItems });
    }

    if (playlistId) {
      items.push(
        { id: 'divider2', divider: true },
        { id: 'remove-playlist', label: 'Remove from Playlist', icon: 'x', danger: true,
          onclick: () => { void removeTrackFromPlaylist(playlistId, track.id).then(() => refreshPlaylists()); } }
      );
    }

    items.push(
      { id: 'divider3', divider: true },
      {
        id: 'favorite',
        label: track.favorite ? 'Remove from Favorites' : 'Add to Favorites',
        icon: track.favorite ? 'heart-filled' : 'heart',
        onclick: () => void toggleFavorite(track),
      },
      { id: 'divider4', divider: true },
      { id: 'edit-metadata', label: 'Edit Metadata', icon: 'edit',
        onclick: () => { editMetadataTrack = track; showEditMetadata = true; } },
    );

    return items;
  }
</script>

<svelte:window onresize={handleResize} />

<div class="tracklist">
  <div class="header">
    <div class="col col-title">Title</div>
    <div class="col col-artist">Artist</div>
    <div class="col col-album">Album</div>
    <div class="col col-fav">Fav</div>
    <div class="col col-time">Time</div>
  </div>

  <div
    class="viewport"
    bind:this={viewportEl}
    onscroll={handleScroll}
    onmouseenter={handleResize}
    role="region"
    aria-label="Track list"
  >
    <div class="spacer" style="height: {totalHeight}px">
      <div class="slice" style="transform: translateY({offsetTop}px)">
        {#each tracks.slice(startIndex, endIndex) as track, localIndex (track.id)}
          {@const index = startIndex + localIndex}
          <button
            type="button"
            class="row"
            style="height: {rowHeight}px"
            title="Double click to play"
            ondblclick={() => onPlay?.(track, index)}
            oncontextmenu={(e) => handleContextMenu(e, track, index)}
          >
            <div class="cell cell-title">
              <div class="art">
                {#if track.artwork_path}
                  {#await ensureArtworkUrl(track.artwork_path)}
                    <div class="art-placeholder">
                      <Icon name="music" size={16} color="var(--text-tertiary)" />
                    </div>
                  {:then url}
                    <img src={url} alt="" loading="lazy" />
                  {:catch}
                    <div class="art-placeholder">
                      <Icon name="music" size={16} color="var(--text-tertiary)" />
                    </div>
                  {/await}
                {:else}
                  <div class="art-placeholder">
                    <Icon name="music" size={16} color="var(--text-tertiary)" />
                  </div>
                {/if}
              </div>
              <div class="meta">
                <div class="title truncate">{track.title}</div>
                <div class="sub truncate">{track.file_format.toUpperCase()}</div>
              </div>
            </div>

            <div class="cell cell-artist truncate">{track.artist}</div>
            <div class="cell cell-album truncate">{track.album}</div>
            <div class="cell cell-fav">
              <span
                class="fav"
                class:active={track.favorite}
                role="button"
                tabindex="0"
                title={track.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onclick={(e) => {
                  e.stopPropagation();
                  void toggleFavorite(track);
                }}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    void toggleFavorite(track);
                  }
                }}
              >
                <Icon
                  name={track.favorite ? 'heart-filled' : 'heart'}
                  size={14}
                  color={track.favorite ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
                />
              </span>
            </div>
            <div class="cell cell-time">{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

{#if contextMenu}
  <ContextMenu
    items={getContextMenuItems(contextMenu.track, contextMenu.index)}
    x={contextMenu.x}
    y={contextMenu.y}
    onClose={closeContextMenu}
  />
{/if}

<EditMetadataModal track={editMetadataTrack} open={showEditMetadata} onClose={() => { showEditMetadata = false; }} />

<style>
  .tracklist {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header {
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 44px 80px;
    gap: var(--space-3);
    padding: 8px 12px;
    border-bottom: 1px solid var(--glass-border);
    color: var(--text-tertiary);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .viewport {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border-radius: var(--radius-2xl);
  }

  .spacer {
    position: relative;
  }

  .slice {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
  }

  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 44px 80px;
    gap: var(--space-3);
    align-items: center;
    padding: 0 12px;
    border: 1px solid transparent;
    border-left: none;
    border-right: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: default;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart);
  }

  .row:hover {
    background: hsla(0, 0%, 100%, 0.04);
    border-color: hsla(0, 0%, 100%, 0.06);
  }

  .row:active {
    opacity: 0.85;
  }

  .row:not(:last-child) {
    border-bottom: 1px solid hsla(0, 0%, 100%, 0.03);
  }

  .cell {
    min-width: 0;
  }

  .cell-fav {
    display: flex;
    justify-content: center;
  }

  .fav {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart);
  }

  .fav:hover {
    background: hsla(0, 0%, 100%, 0.05);
    border-color: hsla(0, 0%, 100%, 0.07);
  }

  .fav:active {
    opacity: 0.7;
  }

  .fav.active {
    background: var(--accent-gradient-subtle);
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.25);
  }

  .cell-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .art {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
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
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .sub {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-tertiary);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cell-time {
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    text-align: right;
    font-size: 11px;
    font-weight: 600;
  }
</style>
