<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import type { Track, MenuItem } from '$lib/types';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { setTrackFavorite } from '$lib/commands/library';
  import { patchTrack } from '$lib/stores/library';
  import { removeTrack } from '$lib/stores/library';
  import { setQueue, playQueueIndex } from '$lib/stores/queue';
  import { addToQueueNext } from '$lib/stores/queue';
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

  function playNextTrack(track: Track) {
    addToQueueNext(track);
  }

  function getContextMenuItems(track: Track, index: number): MenuItem[] {
    const items: MenuItem[] = [
      { id: 'play-next', label: 'Play Next', icon: 'skip-forward', onclick: () => {
        playNextTrack(track);
      }},
      { id: 'divider1', divider: true },
      { id: 'edit-metadata', label: 'Edit Info', icon: 'edit',
        onclick: () => { editMetadataTrack = track; showEditMetadata = true; } },
      { id: 'divider2', divider: true },
      { id: 'remove', label: 'Remove from Library', icon: 'x', danger: true,
        onclick: () => {
          removeTrack(track.id);
        } },
    ];

    return items;
  }
</script>

<svelte:window onresize={handleResize} />

<div class="tracklist">
  <div class="header">
    <div class="col col-index">#</div>
    <div class="col col-title">Track Name</div>
    <div class="col col-artist">Artist</div>
    <div class="col col-album">Album</div>
    <div class="col col-time">Duration</div>
    <div class="col col-actions"></div>
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
          <div
            class="row"
            role="button"
            tabindex="0"
            style="height: {rowHeight}px"
            title="Click to play"
            onclick={() => onPlay?.(track, index)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay?.(track, index); }}
            oncontextmenu={(e) => handleContextMenu(e, track, index)}
          >
            <div class="cell cell-index">
              <span class="index-num">{index + 1}</span>
              <Icon class="index-play" name="play" size={12} />
            </div>
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
            <div class="cell cell-time">{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</div>
            <div class="cell cell-actions">
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
              <button
                class="options-btn"
                title="More options"
                onclick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, track, index);
                }}
              >
                <Icon name="more-horizontal" size={16} />
              </button>
            </div>
          </div>
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
    grid-template-columns: 40px 2fr 1.2fr 1.2fr 60px 80px;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-tertiary);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }

  .viewport {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .spacer { position: relative; }
  .slice { position: absolute; left: 0; right: 0; top: 0; }

  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 40px 2fr 1.2fr 1.2fr 60px 80px;
    gap: 12px;
    align-items: center;
    padding: 0 16px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: default;
    transition: background 0.1s ease;
  }

  .row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .row:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .cell { min-width: 0; }

  .cell-index {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  :global(.cell-index .index-play) {
    display: none;
    color: var(--text-primary);
  }
  .row:hover :global(.cell-index .index-num) { display: none; }
  .row:hover :global(.cell-index .index-play) { display: block; }

  .col-index { text-align: center; }

  .cell-title {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .art {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
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
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .sub {
    font-size: 11px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .cell-artist, .cell-album {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .cell-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .row:hover .cell-actions {
    opacity: 1;
  }

  .cell-actions:focus-within {
    opacity: 1;
  }

  .fav, .options-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    transition: all 0.1s;
  }

  .fav:hover, .options-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }

  .fav.active {
    opacity: 1;
    color: var(--accent-primary);
  }
  
  /* Make active favorites always visible */
  .row:not(:hover) .cell-actions:has(.fav.active) {
    opacity: 1;
  }
  .row:not(:hover) .cell-actions:has(.fav.active) .options-btn {
    opacity: 0;
  }

  .cell-time {
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    text-align: right;
    font-size: 13px;
  }
</style>
