<script lang="ts">
  import GlassCard from '$lib/components/glass/GlassCard.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import WaveBars from '$lib/components/visualizer/WaveBars.svelte';

  import { nowPlayingFullscreen } from '$lib/stores/ui';
  import { currentTrack, isPlaying, playerState, formatTime } from '$lib/stores/player';
  import { playNext, playPrevious, togglePlayPause } from '$lib/stores/queue';
  import { getArtworkUrl } from '$lib/utils/artwork';

  let artworkUrl = $state<string | null>(null);
  let progressPercent = $derived(
    $playerState.duration > 0 ? ($playerState.position / $playerState.duration) * 100 : 0
  );

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
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if $nowPlayingFullscreen}
  <div class="overlay" onclick={close} onkeydown={(e) => { if (e.key === 'Escape') close(); }} role="presentation">
    <div class="sheet" onclick={(e) => e.stopPropagation()} role="presentation">
      <!-- Ambient wave background -->
      <div class="wave-bg" aria-hidden="true">
        <WaveBars track={$currentTrack} bars={96} ambient />
      </div>

      <!-- Background gradient orbs -->
      <div class="bg" aria-hidden="true"></div>

      <div class="topbar">
        <div class="top-left">
          <GlassButton variant="icon" size="sm" title="Close" onclick={close}>
            <Icon name="chevron-down" size={18} />
          </GlassButton>
          <span class="label">Now Playing</span>
        </div>

        <div class="top-right">
          <GlassButton variant="icon" size="sm" title="Queue" onclick={() => {}}>
            <Icon name="queue" size={16} />
          </GlassButton>
        </div>
      </div>

      <div class="content">
        <div class="art-stage">
          <div class="art-card">
            <div class="art-glow" aria-hidden="true">
              {#if artworkUrl}
                <img src={artworkUrl} alt="" />
              {/if}
            </div>
            <div class="art">
              {#if artworkUrl}
                <img src={artworkUrl} alt="Album artwork" />
              {:else}
                <div class="art-placeholder">
                  <Icon name="music" size={54} color="var(--text-tertiary)" />
                </div>
              {/if}
            </div>
            <div class="reflection" aria-hidden="true">
              {#if artworkUrl}
                <img src={artworkUrl} alt="" />
              {/if}
            </div>
          </div>
        </div>

        <div class="meta">
          <h1 class="title truncate">{$currentTrack?.title ?? 'Nothing playing'}</h1>
          <p class="subtitle truncate">
            {$currentTrack?.artist ?? '—'}
            {#if $currentTrack?.album}
              <span class="dot">•</span>
              {$currentTrack.album}
            {/if}
          </p>

          <!-- Progress bar -->
          <div class="progress-row">
            <span class="time-label">{formatTime($playerState.position)}</span>
            <div class="progress-track">
              <div class="progress-fill" style="width: {progressPercent}%"></div>
            </div>
            <span class="time-label">{formatTime($playerState.duration)}</span>
          </div>

          <GlassCard padding="md" radius="xl" class="controls" accent>
            <div class="btns">
              <GlassButton variant="icon" size="sm" title="Previous" onclick={() => void playPrevious()}>
                <Icon name="skip-back" size={18} />
              </GlassButton>

              <button class="play" class:playing={$isPlaying} onclick={() => void togglePlayPause()}>
                {#if $isPlaying}
                  <Icon name="pause" size={20} color="white" />
                {:else}
                  <Icon name="play" size={20} color="white" />
                {/if}
              </button>

              <GlassButton variant="icon" size="sm" title="Next" onclick={() => void playNext()}>
                <Icon name="skip-forward" size={18} />
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: hsla(0, 0%, 0%, 0.55);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    animation: fadeIn var(--duration-normal) var(--ease-out-quart) both;
  }

  .sheet {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .wave-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.3;
    pointer-events: none;
  }

  .bg {
    position: absolute;
    inset: -20%;
    z-index: 0;
    background:
      radial-gradient(900px 700px at 20% 20%, hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.18) 0%, transparent 60%),
      radial-gradient(900px 700px at 80% 70%, hsla(calc(var(--accent-h) + 60), 90%, 60%, 0.14) 0%, transparent 58%),
      radial-gradient(900px 700px at 50% 90%, hsla(calc(var(--accent-h) + 130), 80%, 55%, 0.08) 0%, transparent 55%);
    filter: blur(100px);
    opacity: 0.8;
    transform: scale(1.05);
    animation: float 18s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: scale(1.05) translate(0, 0); }
    33% { transform: scale(1.1) translate(10px, -10px); }
    66% { transform: scale(1.02) translate(-10px, 10px); }
  }

  .topbar {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
  }

  .top-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .content {
    position: relative;
    z-index: 3;
    height: calc(100% - 64px);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
    padding: var(--space-4) var(--space-8) var(--space-8);
    align-items: center;
  }

  @media (max-width: 980px) {
    .content {
      grid-template-columns: 1fr;
      gap: var(--space-6);
      padding: var(--space-4) var(--space-5) var(--space-6);
      overflow: auto;
    }
  }

  .art-stage {
    display: flex;
    justify-content: center;
    position: relative;
  }

  .art-card {
    width: min(420px, 82vw);
    position: relative;
  }

  .art-glow {
    position: absolute;
    inset: -30%;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.35;
    mix-blend-mode: screen;
    pointer-events: none;
    animation: breathe 4s ease-in-out infinite;
  }

  .art-glow img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .art {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-2xl);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-xl), var(--shadow-glow-lg);
    background: var(--bg-tertiary);
    position: relative;
    z-index: 1;
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

  .reflection {
    margin-top: 14px;
    height: 90px;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    opacity: 0.2;
    transform: scaleY(-1);
    filter: blur(3px);
    mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
  }

  .reflection img {
    width: 100%;
    height: auto;
    display: block;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    max-width: 520px;
  }

  .title {
    font-size: clamp(1.4rem, 2.4vw, 2.4rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.12;
    text-shadow: 0 2px 20px hsla(0, 0%, 0%, 0.3);
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: var(--text-md);
    line-height: 1.5;
  }

  .dot {
    margin: 0 8px;
    color: var(--text-tertiary);
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .time-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    min-width: 36px;
  }

  .progress-track {
    flex: 1;
    height: 4px;
    border-radius: 999px;
    background: hsla(0, 0%, 100%, 0.08);
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--accent-gradient);
    box-shadow: 0 0 12px var(--accent-glow);
    transition: width 100ms linear;
  }

  .btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .play {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--accent-gradient);
    box-shadow: 0 0 30px var(--accent-glow-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform var(--duration-fast) var(--ease-out-back),
      box-shadow var(--duration-normal) ease;
  }

  .play:hover {
    transform: scale(1.08);
    box-shadow: 0 0 44px var(--accent-glow-strong);
  }

  .play:active {
    transform: scale(0.94);
  }

  .play.playing {
    animation: pulse-glow 3.5s ease-in-out infinite;
  }
</style>
