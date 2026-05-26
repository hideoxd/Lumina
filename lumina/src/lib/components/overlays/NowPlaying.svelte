<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  import { nowPlayingFullscreen } from '$lib/stores/ui';
  import { currentTrack, isPlaying, playerState, formatTime } from '$lib/stores/player';
  import { playNext, playPrevious, togglePlayPause, seekToSeconds } from '$lib/stores/queue';
  import { getArtworkUrl } from '$lib/utils/artwork';

  let artworkUrl = $state<string | null>(null);
  let progressPercent = $derived(
    $playerState.duration > 0 ? ($playerState.position / $playerState.duration) * 100 : 0
  );
  let fileName = $derived(
    $currentTrack?.file_path ? $currentTrack.file_path.split(/[/\\]/).pop() ?? '' : ''
  );

  let titleBoxW = $state(0);
  let titleW = $state(0);
  let subBoxW = $state(0);
  let subW = $state(0);
  let fileBoxW = $state(0);
  let fileW = $state(0);

  let titleOverflows = $derived(titleW > titleBoxW);
  let subOverflows = $derived(subW > subBoxW);
  let fileOverflows = $derived(fileW > fileBoxW);

  $effect(() => {
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

  function close() {
    nowPlayingFullscreen.set(false);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!$nowPlayingFullscreen) return;
    if (e.key === 'Escape') close();
    if (e.key === ' ') { e.preventDefault(); void togglePlayPause(); }
  }

  function handleProgressClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekToSeconds(percent * $playerState.duration);
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if $nowPlayingFullscreen}
  <div class="fs-overlay">
    <!-- Background: blurred artwork -->
    {#if artworkUrl}
      <div class="fs-bg-art">
        <img src={artworkUrl} alt="" />
      </div>
    {/if}
    <div class="fs-bg-dim"></div>

    <!-- Top bar -->
    <div class="fs-topbar">
      <button class="fs-close-btn" onclick={close} title="Close">
        <Icon name="chevron-down" size={20} />
      </button>
      <span class="fs-label">Now Playing</span>
      <div style="width:40px"></div>
    </div>

    <!-- Center content -->
    <div class="fs-content">
      <div class="fs-disc-container">
        <div class="fs-disc-stack">
          <div class="fs-disc" class:playing={$isPlaying}>
            <div class="fs-disc-grooves"></div>
            <div class="fs-disc-label">
              {#if artworkUrl}
                <img src={artworkUrl} alt="Album artwork" />
              {:else}
                <div class="fs-label-placeholder">
                  <Icon name="music" size={32} color="rgba(255,255,255,0.2)" />
                </div>
              {/if}
              <div class="fs-disc-hole"></div>
            </div>
          </div>
          <div class="fs-cover">
            {#if artworkUrl}
              <img src={artworkUrl} alt="Album artwork" />
            {:else}
              <div class="fs-cover-placeholder">
                <Icon name="music" size={64} color="rgba(255,255,255,0.2)" />
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="fs-info">
        <div class="marquee" bind:clientWidth={titleBoxW}>
          <div class="marquee-track" class:scrolling={titleOverflows} bind:clientWidth={titleW}>
            <span class="fs-title">{$currentTrack?.title ?? 'Nothing playing'}</span>
            {#if titleOverflows}
              <span class="fs-title">{$currentTrack?.title ?? 'Nothing playing'}</span>
            {/if}
          </div>
        </div>
        <div class="marquee" bind:clientWidth={subBoxW}>
          <div class="marquee-track" class:scrolling={subOverflows} bind:clientWidth={subW}>
            <span class="fs-subtitle">
              {$currentTrack?.artist ?? '—'}
              {#if $currentTrack?.album}
                <span class="fs-dot">·</span>
                {$currentTrack.album}
              {/if}
            </span>
            {#if subOverflows}
              <span class="fs-subtitle">
                {$currentTrack?.artist ?? '—'}
                {#if $currentTrack?.album}
                  <span class="fs-dot">·</span>
                  {$currentTrack.album}
                {/if}
              </span>
            {/if}
          </div>
        </div>
        {#if fileName}
          <div class="marquee" bind:clientWidth={fileBoxW}>
            <div class="marquee-track" class:scrolling={fileOverflows} bind:clientWidth={fileW}>
              <span class="fs-filename">{fileName}</span>
              {#if fileOverflows}
                <span class="fs-filename">{fileName}</span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Progress bar -->
        <div class="fs-progress-row">
          <span class="fs-time">{formatTime($playerState.position)}</span>
          <div
            class="fs-progress-track"
            role="slider"
            aria-valuenow={$playerState.position}
            tabindex="0"
            onclick={handleProgressClick}
            onkeydown={(e) => {
              if (e.key === 'ArrowRight') seekToSeconds($playerState.position + 5);
              if (e.key === 'ArrowLeft') seekToSeconds($playerState.position - 5);
            }}
          >
            <div class="fs-progress-fill" style="width: {progressPercent}%"></div>
          </div>
          <span class="fs-time">{formatTime($playerState.duration)}</span>
        </div>

        <!-- Controls -->
        <div class="fs-controls">
          <button class="fs-ctrl-btn" onclick={() => void playPrevious()}>
            <Icon name="skip-back" size={22} />
          </button>
          <button class="fs-play-btn" onclick={() => void togglePlayPause()}>
            <Icon name={$isPlaying ? 'pause' : 'play'} size={24} />
          </button>
          <button class="fs-ctrl-btn" onclick={() => void playNext()}>
            <Icon name="skip-forward" size={22} />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .fs-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #000;
    display: flex;
    flex-direction: column;
  }

  .fs-bg-art {
    position: absolute;
    inset: -40px;
    z-index: 0;
  }

  .fs-bg-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(60px) saturate(1.2);
    transform: scale(1.2);
  }

  .fs-bg-dim {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.85);
  }

  /* Topbar */
  .fs-topbar {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
  }

  .fs-close-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    color: rgba(255, 255, 255, 0.8);
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fs-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .fs-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Content */
  .fs-content {
    position: relative;
    z-index: 10;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    padding: 20px 80px 60px;
    align-items: center;
  }

  @media (max-width: 900px) {
    .fs-content {
      grid-template-columns: 1fr;
      padding: 20px 32px 40px;
      gap: 32px;
    }
  }

  .fs-disc-container {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
  }

  .fs-disc-stack {
    position: relative;
    width: min(400px, 70vw);
    aspect-ratio: 1;
    overflow: visible;
  }

  /* ── Cover (front) ── */
  .fs-cover {
    position: absolute;
    top: 0;
    left: -15%;
    width: 100%;
    height: 100%;
    z-index: 2;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .fs-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fs-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  /* ── Vinyl disc (behind cover, shifted right) ── */
  .fs-disc {
    position: absolute;
    top: 10%;
    left: 40%;
    width: 85%;
    height: 85%;
    z-index: 1;
    border-radius: 50%;
    background: #111;
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.6),
      inset 0 0 40px rgba(0, 0, 0, 0.9),
      0 0 0 3px rgba(255, 255, 255, 0.04),
      0 0 0 7px rgba(255, 255, 255, 0.02);
    animation: discSpin 4s linear infinite;
    animation-play-state: paused;
    transform: translateX(20%);
  }

  .fs-disc.playing {
    animation-play-state: running;
  }

  /* Grooves */
  .fs-disc-grooves {
    position: absolute;
    inset: 9%;
    border-radius: 50%;
    background: repeating-radial-gradient(
      circle at center,
      transparent 0px,
      transparent 0.8px,
      rgba(255, 255, 255, 0.012) 0.8px,
      rgba(255, 255, 255, 0.012) 1.6px
    );
    pointer-events: none;
    z-index: 1;
  }

  /* Center label */
  .fs-disc-label {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42%;
    height: 42%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    overflow: hidden;
    background: #000;
    border: 2px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
    z-index: 2;
  }

  .fs-disc-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fs-label-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  /* Spindle hole */
  .fs-disc-hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8%;
    height: 8%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #111;
    border: 1px solid rgba(255, 255, 255, 0.06);
    z-index: 3;
  }

  @keyframes discSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Info section */
  .fs-info {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 500px;
  }

  .fs-title {
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    font-weight: 800;
    color: white;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0;
  }

  .fs-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  .fs-dot {
    margin: 0 8px;
    color: rgba(255, 255, 255, 0.3);
  }

  .fs-filename {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    font-family: monospace;
    letter-spacing: 0.02em;
    margin: 0;
  }

  /* ── Marquee / rolling text ── */
  .marquee {
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
  }

  .marquee-track {
    display: inline-flex;
    white-space: nowrap;
    gap: 0;
  }

  .marquee-track.scrolling {
    will-change: transform;
    animation: marqueeScroll 15s linear infinite;
  }

  .marquee-track.scrolling .fs-title::after,
  .marquee-track.scrolling .fs-subtitle::after,
  .marquee-track.scrolling .fs-filename::after {
    content: '   \00B7   ';
    white-space: pre;
    opacity: 0.4;
  }

  .marquee-track.scrolling .fs-title:last-child::after,
  .marquee-track.scrolling .fs-subtitle:last-child::after,
  .marquee-track.scrolling .fs-filename:last-child::after {
    content: none;
  }

  @keyframes marqueeScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* Progress */
  .fs-progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .fs-time {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
  }

  .fs-progress-track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    cursor: pointer;
    position: relative;
  }

  .fs-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: white;
    transition: width 100ms linear;
  }

  /* Controls */
  .fs-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }

  .fs-ctrl-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: rgba(255, 255, 255, 0.75);
    border: none;
    cursor: pointer;
    transition: all 0.1s;
  }

  .fs-ctrl-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .fs-play-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    color: #000;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fs-play-btn:hover {
    transform: scale(1.06);
  }

  .fs-play-btn:active {
    transform: scale(0.96);
  }
</style>
