<script lang="ts">
  import GlassModal from '$lib/components/glass/GlassModal.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
  import { updateTrackMetadata } from '$lib/commands/library';
  import { patchTrack } from '$lib/stores/library';
  import type { Track } from '$lib/types';

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
        album_artist: albumArtist || undefined,
        genre: genre || undefined,
        year: year || undefined,
        track_number: trackNumber || undefined,
        disc_number: discNumber || undefined,
        composer: composer || undefined,
        publisher: publisher || undefined,
        comments: comments || undefined,
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
      } as Partial<Track>);
      onClose();
    } catch (e) {
      console.error('Failed to save metadata', e);
    } finally {
      saving = false;
    }
  }
</script>

<GlassModal title="Edit Metadata" size="sm" {open} onClose={onClose}>
  {#snippet children()}
    <div class="edit-modal">
      <div class="field">
        <label class="field-label" for="title">Title</label>
        <input id="title" type="text" class="glass-input" bind:value={title} />
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
      <GlassButton variant="ghost" onclick={onClose}>Cancel</GlassButton>
      <GlassButton variant="primary" onclick={handleSave} disabled={saving || !title.trim()}>
        {saving ? 'Saving...' : 'Save'}
      </GlassButton>
    </div>
  {/snippet}
</GlassModal>

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
  }

  .field-row {
    display: flex;
    gap: var(--space-3);
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
    padding: var(--space-3) var(--space-4);
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
