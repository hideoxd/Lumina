<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { updateTrackMetadata } from '$lib/commands/library';
  import { patchTrack } from '$lib/stores/library';
  import type { Track } from '$lib/types';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';

  let {
    track,
    open,
    onClose,
  }: { track: Track | null; open: boolean; onClose: () => void } = $props();

  let title = $state('');
  let artist = $state('');
  let album = $state('');
  let albumArtist = $state('');
  let genre = $state('');
  let year = $state('');
  let trackNumber = $state('');
  let discNumber = $state('');
  let composer = $state('');
  let publisher = $state('');
  let comments = $state('');
  let artworkPath = $state('');

  let saving = $state(false);

  $effect(() => {
    if (track && open) {
      title = track.title;
      artist = track.artist;
      album = track.album;
      albumArtist = track.album_artist ?? '';
      genre = track.genre ?? '';
      year = track.year?.toString() ?? '';
      trackNumber = track.track_number?.toString() ?? '';
      discNumber = track.disc_number?.toString() ?? '';
      composer = track.composer ?? '';
      publisher = track.publisher ?? '';
      comments = track.comments ?? '';
      artworkPath = track.artwork_path ?? '';
    }
  });

  async function handleSave() {
    if (!track) return;
    saving = true;
    try {
      await updateTrackMetadata(track.id, {
        title,
        artist,
        album,
        album_artist: albumArtist,
        genre,
        year,
        track_number: trackNumber,
        disc_number: discNumber,
        composer,
        publisher,
        comments,
        artwork_path: artworkPath,
      });
      patchTrack(track.id, {
        title,
        artist,
        album,
        album_artist: albumArtist || null,
        genre: genre || null,
        year: year ? parseInt(year, 10) : null,
        track_number: trackNumber ? parseInt(trackNumber, 10) : null,
        disc_number: discNumber ? parseInt(discNumber, 10) : null,
        composer: composer || null,
        publisher: publisher || null,
        comments: comments || null,
        artwork_path: artworkPath || null,
      } as Partial<Track>);
      onClose();
    } catch (e) {
      console.error('Failed to save metadata', e);
    } finally {
      saving = false;
    }
  }

  async function handleSelectImage() {
    const file = await openDialog({
      multiple: false,
      filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (file && typeof file === 'string') {
      artworkPath = file;
    } else if (file && typeof file === 'object' && 'path' in file) {
      artworkPath = (file as any).path;
    }
  }
</script>

<Modal title="Edit Metadata" size="sm" {open} onClose={onClose}>
  {#snippet children()}
    <div class="edit-modal">
      <div class="field-row">
        <div class="field art-picker">
          <label class="field-label" for="cover-image">Cover Image</label>
          <button id="cover-image" class="art-btn" onclick={handleSelectImage} title={artworkPath || 'No image'}>
            {#if artworkPath}
              <span class="art-path truncate">{artworkPath.split(/[/\\]/).pop()}</span>
            {:else}
              Select Image
            {/if}
          </button>
        </div>
        <div class="field" style="flex: 2;">
          <label class="field-label" for="title">Title</label>
          <input id="title" type="text" class="glass-input" bind:value={title} />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="artist">Artist</label>
        <input id="artist" type="text" class="glass-input" bind:value={artist} />
      </div>
      <div class="field">
        <label class="field-label" for="album">Album</label>
        <input id="album" type="text" class="glass-input" bind:value={album} />
      </div>
      <div class="field">
        <label class="field-label" for="album-artist">Album Artist</label>
        <input id="album-artist" type="text" class="glass-input" bind:value={albumArtist} />
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="genre">Genre</label>
          <input id="genre" type="text" class="glass-input" bind:value={genre} />
        </div>
        <div class="field">
          <label class="field-label" for="year">Year</label>
          <input id="year" type="number" class="glass-input" bind:value={year} />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="track-number">Track #</label>
          <input id="track-number" type="number" class="glass-input" bind:value={trackNumber} />
        </div>
        <div class="field">
          <label class="field-label" for="disc-number">Disc #</label>
          <input id="disc-number" type="number" class="glass-input" bind:value={discNumber} />
        </div>
      </div>
      <div class="divider"></div>
      <div class="section-label">Additional Info</div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="composer">Composer</label>
          <input id="composer" type="text" class="glass-input" bind:value={composer} />
        </div>
        <div class="field">
          <label class="field-label" for="publisher">Publisher</label>
          <input id="publisher" type="text" class="glass-input" bind:value={publisher} />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="comments">Comments</label>
        <textarea id="comments" class="glass-input glass-textarea" bind:value={comments} rows="3"></textarea>
      </div>
    </div>
  {/snippet}
  {#snippet footer()}
    <div class="edit-footer">
      <Button variant="ghost" onclick={onClose}>Cancel</Button>
      <Button variant="primary" onclick={handleSave} disabled={saving || !title.trim()}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  {/snippet}
</Modal>

<style>
  .edit-modal {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .field-row {
    display: flex;
    gap: var(--space-3);
    align-items: flex-end;
  }

  .art-picker {
    flex: 1;
  }

  .art-btn {
    height: 40px;
    border-radius: var(--radius-md);
    border: 1px dashed rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.02);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: 13px;
    transition: all 0.15s;
    overflow: hidden;
  }
  .art-btn:hover {
    background: rgba(255,255,255,0.06);
    color: white;
    border-color: rgba(255,255,255,0.4);
  }
  .art-path {
    max-width: 100%;
    color: white;
  }

  .field-label {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .glass-input {
    width: 100%;
    height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: var(--text-md);
    outline: none;
    transition: border-color var(--duration-fast) var(--ease-out-quart);
    box-sizing: border-box;
  }

  .glass-input:focus {
    border-color: var(--accent-primary);
  }

  .glass-input::placeholder {
    color: var(--text-disabled);
  }

  .glass-input[type="number"]::-webkit-inner-spin-button,
  .glass-input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .glass-input[type="number"] {
    -moz-appearance: textfield;
  }

  .glass-textarea {
    resize: vertical;
    min-height: 60px;
    font-family: var(--font-sans);
    line-height: 1.5;
  }

  .divider {
    height: 1px;
    background: var(--glass-border);
    margin: var(--space-2) 0;
  }

  .section-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--space-1);
  }

  .edit-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
</style>
