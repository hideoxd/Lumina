<!--
  PlayerBar — Bottom player bar with glass surface, playback controls, progress, and volume
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { playerState, currentTrack, isPlaying, progress, formatTime } from '$lib/stores/player';
  import { nowPlayingFullscreen, toggleQueue, queuePanelOpen } from '$lib/stores/ui';
  import { playNext, playPrevious, seekToSeconds, setPlayerVolume01, togglePlayPause } from '$lib/stores/queue';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { setTrackFavorite } from '$lib/commands/library';
  import { patchTrack } from '$lib/stores/library';

  let volumeValue = $state(80);
  let progressValue = $state(0);
  let progressSeeking = $state(false);
  let isMuted = $state(false);
  let repeatMode = $state<'off' | 'one' | 'all'>('off');
  let isShuffled = $state(false);

  let artworkUrl = $state<string | null>(null);

  $effect(() => {
    // Keep local slider states in sync with store
    volumeValue = Math.round(($playerState.isMuted ? 0 : $playerState.volume) * 100);
    isMuted = $playerState.isMuted;
    if (!progressSeeking) {
      progressValue = Math.max(0, Math.min(100, ($progress ?? 0) * 100));
    }
  });

  $effect(() => {
    // Resolve artwork url (async)
    const filename = $currentTrack?.artwork_path;
    if (!filename) {
      artworkUrl = null;
      return;
    }
    void (async () => {
      try {
        artworkUrl = await getArtworkUrl(filename);
      } catch {
        artworkUrl = null;
      }
    })();
  });

  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
      void setPlayerVolume01(0);
      playerState.update((s) => ({ ...s, isMuted: true }));
    } else {
      void setPlayerVolume01(Math.max(0.05, volumeValue / 100));
      playerState.update((s) => ({ ...s, isMuted: false }));
    }
  }

  function cycleRepeat() {
    if (repeatMode === 'off') repeatMode = 'all';
    else if (repeatMode === 'all') repeatMode = 'one';
    else repeatMode = 'off';
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
  }

  function openNowPlaying() {
    nowPlayingFullscreen.set(true);
  }

  async function toggleCurrentFavorite() {
    const t = $currentTrack;
    if (!t) return;
    const next = !t.favorite;

    patchTrack(t.id, { favorite: next });
    playerState.update((s) =>
      s.currentTrack && s.currentTrack.id === t.id
        ? { ...s, currentTrack: { ...s.currentTrack, favorite: next } }
        : s
    );

    try {
      await setTrackFavorite(t.id, next);
    } catch {
      patchTrack(t.id, { favorite: !next });
      playerState.update((s) =>
        s.currentTrack && s.currentTrack.id === t.id
          ? { ...s, currentTrack: { ...s.currentTrack, favorite: !next } }
          : s
      );
    }
  }

  function getVolumeIcon(): string {
    if (isMuted || volumeValue === 0) return 'volume-x';
    if (volumeValue < 50) return 'volume-1';
    return 'volume-2';
  }

  // Calculate current time from progress
  let currentTime = $derived(Math.floor(($playerState.position ?? 0)));
</script>

<footer class="player-bar">
  <div class="player-content">
    <!-- Left: Track info -->
    <div class="player-left">
      <button class="album-art-container" onclick={openNowPlaying} title="Open Now Playing">
        <div class="album-art">
          {#if artworkUrl}
            <img src={artworkUrl} alt="Album artwork" />
          {:else}
            <div class="album-art-placeholder">
              <Icon name="music" size={22} color="var(--text-tertiary)" />
            </div>
          {/if}
        </div>
        <div class="art-overlay">
          <Icon name="maximize" size={14} />
        </div>
      </button>

      <div class="track-info">
        <button class="track-title truncate" onclick={openNowPlaying} title={$currentTrack?.title ?? 'Nothing playing'}>
          {$currentTrack?.title ?? 'Nothing playing'}
        </button>
        <span class="track-artist truncate" title={$currentTrack?.artist ?? ''}>
          {$currentTrack?.artist ?? '—'}
        </span>
      </div>

      <!-- Favorite button -->
      <Button
        variant="icon"
        size="xs"
        title={$currentTrack?.favorite ? 'Remove from favorites' : 'Add to favorites'}
        onclick={() => void toggleCurrentFavorite()}
      >
        <Icon
          name={$currentTrack?.favorite ? 'heart-filled' : 'heart'}
          size={14}
          color={$currentTrack?.favorite ? 'var(--accent-primary)' : 'var(--text-secondary)'}
        />
      </Button>
    </div>

    <!-- Center: Playback controls + progress -->
    <div class="player-center">
      <div class="playback-controls">
        <Button
          variant="icon"
          size="sm"
          title={isShuffled ? 'Shuffle on' : 'Shuffle off'}
          onclick={toggleShuffle}
        >
          <Icon
            name="shuffle"
            size={15}
            color={isShuffled ? 'var(--accent-primary)' : 'var(--text-secondary)'}
          />
        </Button>

        <Button variant="icon" size="sm" title="Previous" onclick={() => void playPrevious()}>
          <Icon name="skip-back" size={16} />
        </Button>

        <!-- Play/Pause button — larger, accent-colored -->
        <button class="play-btn" class:playing={$isPlaying} onclick={() => void togglePlayPause()} title={$isPlaying ? 'Pause' : 'Play'}>
          <div class="play-btn-inner">
            {#if $isPlaying}
              <Icon name="pause" size={18} color="white" />
            {:else}
              <Icon name="play" size={18} color="white" />
            {/if}
          </div>
        </button>

        <Button variant="icon" size="sm" title="Next" onclick={() => void playNext()}>
          <Icon name="skip-forward" size={16} />
        </Button>

        <Button
          variant="icon"
          size="sm"
          title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
          onclick={cycleRepeat}
        >
          <Icon
            name={repeatMode === 'one' ? 'repeat-1' : 'repeat'}
            size={15}
            color={repeatMode !== 'off' ? 'var(--accent-primary)' : 'var(--text-secondary)'}
          />
        </Button>
      </div>

      <!-- Progress bar -->
      <div class="progress-row">
        <span class="time-label">{formatTime(currentTime)}</span>
        <div class="progress-slider">
          <Slider
            bind:value={progressValue}
            min={0}
            max={100}
            step={0.1}
            size="sm"
            showTooltip
            formatTooltip={(v) => formatTime(Math.floor((v / 100) * ($playerState.duration || 0)))}
            oninput={() => (progressSeeking = true)}
            onchange={(v) => {
              progressSeeking = false;
              const dur = $playerState.duration || 0;
              if (!dur || !$currentTrack) return;
              void seekToSeconds((v / 100) * dur);
            }}
          />
        </div>
        <span class="time-label">{formatTime($playerState.duration || 0)}</span>
      </div>
    </div>

    <!-- Right: Volume + extra controls -->
    <div class="player-right">
      <Button
        variant="icon"
        size="sm"
        title={$queuePanelOpen ? 'Hide queue' : 'Show queue'}
        onclick={toggleQueue}
      >
        <Icon
          name="queue"
          size={15}
          color={$queuePanelOpen ? 'var(--accent-primary)' : 'var(--text-secondary)'}
        />
      </Button>

      <div class="volume-control">
        <Button variant="icon" size="xs" title={isMuted ? 'Unmute' : 'Mute'} onclick={toggleMute}>
          <Icon name={getVolumeIcon()} size={15} />
        </Button>
        <div class="volume-slider">
          <Slider
            bind:value={volumeValue}
            min={0}
            max={100}
            step={1}
            size="sm"
            oninput={(v) => void setPlayerVolume01(v / 100)}
          />
        </div>
      </div>
    </div>
  </div>
</footer>

<style>
  .player-bar {
    height: var(--player-bar-height);
    background: hsla(225, 15%, 8%, 0.95);

    border-top: 1px solid var(--glass-border);
    position: relative;
    z-index: var(--z-sticky);
    overflow: hidden;
  }

  :global([data-theme="light"]) .player-bar {
    background: hsla(225, 15%, 98%, 0.95);
  }

  .player-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 var(--space-5);
    position: relative;
    z-index: 1;
  }

  /* Left: Track info */
  .player-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 180px;
    max-width: 360px;
    flex: 1;
  }

  .album-art-container {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--duration-fast) var(--ease-out-back);
    box-shadow: var(--shadow-md);
  }

  .album-art-container:hover {
    transform: scale(1.08);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
  }

  .album-art-container:hover .art-overlay {
    opacity: 1;
  }

  .album-art-container:active {
    transform: scale(0.95);
  }

  .album-art {
    width: 100%;
    height: 100%;
  }

  .album-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .album-art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
  }

  .art-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsla(0, 0%, 0%, 0.6);
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  .track-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 3px;
  }

  .track-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    max-width: 140px;
    min-width: 0;
    transition: color var(--duration-fast) ease;
  }

  .track-title:hover {
    color: var(--accent-primary);
  }

  .track-artist {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    max-width: 140px;
    min-width: 0;
  }

  /* Center: Controls */
  .player-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    max-width: 650px;
    flex: 2;
  }

  .playback-controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  /* Play button — special treatment */
  .play-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--accent-gradient);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 20px var(--accent-glow);
    transition:
      transform var(--duration-fast) var(--ease-out-back),
      box-shadow var(--duration-normal) ease;
  }

  .play-btn:hover {
    transform: scale(1.12);
    box-shadow: 0 0 32px var(--accent-glow-strong);
  }

  .play-btn:active {
    transform: scale(0.92);
  }

  .play-btn.playing {
    box-shadow: 0 0 24px var(--accent-glow-strong);
  }

  .play-btn-inner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Inner light on play button */
  .play-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, hsla(0,0%,100%,0.25) 0%, transparent 50%);
    pointer-events: none;
  }

  /* Progress row */
  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }

  .time-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
    min-width: 40px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .progress-slider {
    flex: 1;
  }

  /* Right: Volume */
  .player-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 180px;
    max-width: 360px;
    flex: 1;
    justify-content: flex-end;
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .volume-slider {
    width: 80px;
  }
</style>
