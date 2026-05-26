<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
  import Icon from '$lib/components/Icon.svelte';

  import { nowPlayingFullscreen } from '$lib/stores/ui';
  import { currentTrack, isPlaying, playerState, formatTime } from '$lib/stores/player';
  import { playNext, playPrevious, togglePlayPause, seekToSeconds } from '$lib/stores/queue';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import LyricsPanel from '$lib/components/overlays/LyricsPanel.svelte';

  let showLyrics = $state(false);
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
  <div class="fs-overlay" in:fly={{ y: 60, opacity: 0, duration: 500, easing: quintOut }} out:fly={{ y: 40, duration: 250, easing: cubicOut }}>
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
      <button class="fs-lyrics-btn" class:active={showLyrics} onclick={() => showLyrics = !showLyrics} title={showLyrics ? 'Show artwork' : 'Show lyrics'}>
        <Icon name="mic" size={16} />
      </button>
    </div>

    <!-- Center content -->
    <div class="fs-content" class:lyrics-mode={showLyrics}>
      {#if showLyrics}
        <!-- Lyrics mode: sidebar + full lyrics panel -->
        <div class="fs-lyrics-sidebar">
          <div class="fs-ls-card">
            <!-- Brand -->
            <div class="fs-ls-brand">
              <Icon name="music" size={16} color="rgba(255,255,255,0.3)" />
              <span>Lumina</span>
            </div>

            <!-- Artwork -->
            <div class="fs-ls-artwork">
              {#if artworkUrl}
                <img src={artworkUrl} alt="" />
              {:else}
                <div class="fs-ls-art-ph">
                  <Icon name="music" size={28} color="rgba(255,255,255,0.15)" />
                </div>
              {/if}
            </div>

            <!-- Compact track info -->
            <div class="fs-ls-info">
              <div class="fs-ls-title">{$currentTrack?.title ?? 'Nothing playing'}</div>
              <div class="fs-ls-artist">{$currentTrack?.artist ?? '—'}</div>
            </div>

            <!-- Controls -->
            <div class="fs-ls-controls">
              <button class="fs-ls-ctrl" onclick={() => void playPrevious()}>
                <Icon name="skip-back" size={18} />
              </button>
              <button class="fs-ls-play" onclick={() => void togglePlayPause()}>
                <Icon name={$isPlaying ? 'pause' : 'play'} size={20} />
              </button>
              <button class="fs-ls-ctrl" onclick={() => void playNext()}>
                <Icon name="skip-forward" size={18} />
              </button>
            </div>

            <!-- Progress/seeker -->
            <div class="fs-ls-progress">
              <div class="fs-ls-progress-track" role="slider" tabindex="0" aria-valuenow={$playerState.position} onclick={handleProgressClick} onkeydown={(e) => { if (e.key === 'ArrowRight') seekToSeconds($playerState.position + 5); if (e.key === 'ArrowLeft') seekToSeconds($playerState.position - 5); }}>
                <div class="fs-ls-progress-fill" style="width: {progressPercent}%"></div>
              </div>
              <div class="fs-ls-times">
                <span>{formatTime($playerState.position)}</span>
                <span>{formatTime($playerState.duration)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="fs-lyrics-main">
          <LyricsPanel />
        </div>
      {:else}
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

        <div class="fs-hints">
          <span><kbd>Space</kbd> Play/Pause</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    {/if}
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

  /* Staggered entrance for children */
  .fs-overlay :global(.fs-topbar) {
    animation: fsStaggerUp 0.5s 0.08s both cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fs-overlay :global(.fs-bg-art),
  .fs-overlay :global(.fs-bg-dim) {
    animation: fsStaggerFade 0.6s 0.05s both ease-out;
  }

  .fs-overlay :global(.fs-disc-container) {
    animation: fsStaggerUp 0.55s 0.18s both cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fs-overlay :global(.fs-lyrics-sidebar) {
    animation: fsStaggerUp 0.55s 0.18s both cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fs-overlay :global(.fs-lyrics-main) {
    animation: fsStaggerFade 0.5s 0.25s both ease-out;
  }

  .fs-overlay :global(.fs-info) {
    animation: fsStaggerUp 0.5s 0.3s both cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fsStaggerUp {
    from {
      opacity: 0;
      transform: translateY(32px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fsStaggerFade {
    from { opacity: 0; }
    to { opacity: 1; }
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

  .fs-lyrics-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    color: rgba(255, 255, 255, 0.4);
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fs-lyrics-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }

  .fs-lyrics-btn.active {
    color: var(--accent, #64b5f6);
    background: rgba(255, 255, 255, 0.12);
  }

  .fs-lyrics-btn.active:hover {
    background: rgba(255, 255, 255, 0.18);
    color: var(--accent, #90caf9);
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

  /* Lyrics mode overrides */
  .fs-content.lyrics-mode {
    grid-template-columns: 1fr 3fr;
    gap: 0;
    padding: 0;
  }

  @media (max-width: 900px) {
    .fs-content.lyrics-mode {
      grid-template-columns: 1fr;
      padding: 12px 16px;
    }
  }

  .fs-lyrics-main {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    width: 100%;
    height: 100%;
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

  /* Keyboard hints */
  .fs-hints {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 24px;
    opacity: 0.35;
    transition: opacity 0.2s ease;
  }

  .fs-hints:hover {
    opacity: 0.6;
  }

  .fs-hints span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .fs-hints kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: inherit;
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
  }

  /* ═══════════════════════════════════════
     Lyrics Sidebar
     ═══════════════════════════════════════ */
  /* ── Sidebar wrapper: centers the floating card ── */
  .fs-lyrics-sidebar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
  }

  /* ── Floating glass card ── */
  .fs-ls-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 28px 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(12px);
    width: 100%;
    max-width: 200px;
  }

  .fs-ls-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.25);
  }

  .fs-ls-artwork {
    width: 120px;
    height: 120px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    background: #000;
  }

  .fs-ls-artwork img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fs-ls-art-ph {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
  }

  .fs-ls-info {
    text-align: center;
    max-width: 100%;
    overflow: hidden;
  }

  .fs-ls-title {
    font-size: 14px;
    font-weight: 700;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .fs-ls-artist {
    font-size: 12px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .fs-ls-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .fs-ls-ctrl {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fs-ls-ctrl:hover {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }

  .fs-ls-play {
    width: 44px;
    height: 44px;
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

  .fs-ls-play:hover {
    transform: scale(1.06);
  }

  .fs-ls-play:active {
    transform: scale(0.96);
  }

  .fs-ls-progress {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fs-ls-progress-track {
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    position: relative;
  }

  .fs-ls-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.5);
    transition: width 100ms linear;
  }

  .fs-ls-times {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
    font-variant-numeric: tabular-nums;
  }
</style>
