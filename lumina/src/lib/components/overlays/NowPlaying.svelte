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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="overlay" onclick={close} onkeydown={(e) => { if (e.key === 'Escape') close(); }} role="presentation">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sheet" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="bg" aria-hidden="true"></div>

      <div class="topbar">
        <div class="top-left">
          <GlassButton variant="icon" size="sm" title="Close" onclick={close}>
            <Icon name="chevron-down" size={18} />
          </GlassButton>
          <span class="label">Now Playing</span>
        </div>

        <div class="top-right">
          <GlassButton variant="icon" size="sm" title="Queue" onclick={() => { /* handled by PlayerBar */ }}>
            <Icon name="queue" size={16} />
          </GlassButton>
        </div>
      </div>

      <div class="content">
        <div class="art-stage">
          <div class="art-card">
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

          <WaveBars track={$currentTrack} playing={$isPlaying} />

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

            <div class="time">
              <span>{formatTime($playerState.position)}</span>
              <span class="sep">/</span>
              <span>{formatTime($playerState.duration)}</span>
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
    background: hsla(0, 0%, 0%, 0.45);
    backdrop-filter: blur(18px) saturate(1.3);
    -webkit-backdrop-filter: blur(18px) saturate(1.3);
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

  .bg {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(900px 700px at 20% 20%, hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.20) 0%, transparent 60%),
      radial-gradient(900px 700px at 80% 70%, hsla(calc(var(--accent-h) + 60), 90%, 60%, 0.16) 0%, transparent 58%),
      radial-gradient(900px 700px at 50% 90%, hsla(calc(var(--accent-h) + 130), 80%, 55%, 0.10) 0%, transparent 55%);
    filter: blur(80px);
    opacity: 0.75;
    transform: scale(1.05);
    animation: float 18s ease-in-out infinite;
  }

  .topbar {
    position: relative;
    z-index: 2;
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
    z-index: 2;
    height: calc(100% - 64px);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
    padding: var(--space-6) var(--space-8) var(--space-8);
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
  }

  .art-card {
    width: min(420px, 82vw);
  }

  .art {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius-2xl);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-xl), var(--shadow-glow-lg);
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

  .reflection {
    margin-top: 14px;
    height: 110px;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    opacity: 0.24;
    transform: scaleY(-1);
    filter: blur(2px);
    mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 85%);
  }

  .reflection img {
    width: 100%;
    height: auto;
    display: block;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-width: 520px;
  }

  .title {
    font-size: clamp(1.4rem, 2.4vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.12;
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


  .btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .play {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accent-gradient);
    box-shadow: 0 0 26px var(--accent-glow-strong);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform var(--duration-fast) var(--ease-out-back),
      box-shadow var(--duration-normal) ease;
  }

  .play:hover {
    transform: scale(1.06);
    box-shadow: 0 0 36px var(--accent-glow-strong);
  }

  .play:active {
    transform: scale(0.95);
  }

  .play.playing {
    animation: pulse-glow 3.5s ease-in-out infinite;
  }

  .time {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 8px;
    font-variant-numeric: tabular-nums;
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sep {
    opacity: 0.5;
  }
</style>
