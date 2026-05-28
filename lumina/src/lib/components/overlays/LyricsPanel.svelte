<script lang="ts">
  import { lyricsStore, currentLine, lyricsLoading, lyricsError, fetchLyrics } from '$lib/stores/lyrics';
  import { currentTrack } from '$lib/stores/player';

  let prevTrackId = $state<string | null>(null);

  // Auto-fetch lyrics when track changes
  $effect(() => {
    const track = $currentTrack;
    if (track && track.id !== prevTrackId) {
      prevTrackId = track.id;
      void fetchLyrics(track);
    }
  });
</script>

<div class="lyrics-panel">
  {#if $lyricsLoading}
    <div class="lyrics-state">
      <div class="lyrics-spinner"></div>
      <span class="lyrics-state-text">Loading lyrics…</span>
    </div>
  {:else if $lyricsError}
    <div class="lyrics-state">
      <span class="lyrics-state-icon">!</span>
      <span class="lyrics-state-text">{$lyricsError}</span>
      <button class="lyrics-retry-btn" onclick={() => $currentTrack && fetchLyrics($currentTrack)}>
        Retry
      </button>
    </div>
  {:else if $lyricsStore}
    {@const data = $lyricsStore}
    {#if data.synced.length > 0}
      <!-- Each line is absolutely positioned so the current one sits fixed at center.
           The `--offset` var shifts each line up/down from the center slot. -->
      <div class="lyrics-viewport">
        {#each data.synced as line, i (i)}
          <div
            class="lyrics-line"
            class:active={$currentLine === i}
            class:passed={$currentLine >= 0 && $currentLine > i}
            class:upcoming={$currentLine >= 0 && $currentLine < i}
            style="--offset: {(i - (Math.max(0, $currentLine)))}"
            data-lyric-line={i}
          >
            <span class="lyrics-text">{line.text}</span>
          </div>
        {/each}

        <!-- Subtle center indicator glow -->
        <div class="lyrics-center-glow"></div>
      </div>
    {:else if data.plain}
      <div class="lyrics-plain">
        {#each data.plain.split('\n') as line}
          {#if line.trim()}
            <div class="lyrics-plain-line">{line.trim()}</div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="lyrics-state">
        <span class="lyrics-state-text">No lyrics found for this track</span>
      </div>
    {/if}
  {:else}
    <div class="lyrics-state">
      <span class="lyrics-state-text">No lyrics available</span>
    </div>
  {/if}
</div>

<style>
  .lyrics-panel {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Viewport: clips lines at edges, gradient fades at top/bottom ── */
  .lyrics-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 12%,
      #000 88%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 12%,
      #000 88%,
      transparent 100%
    );
  }

  /* ── Each line is absolutely positioned at the vertical center ── */
  .lyrics-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    display: flex;
    justify-content: flex-start;
    padding: 0 48px;
    pointer-events: none;

    /* Center the line's midpoint at 50%, then shift by offset * rowHeight */
    transform: translateY(calc(-50% + var(--offset) * 56px));
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lyrics-text {
    font-size: 1.25rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.12);
    line-height: 1.5;
    display: block;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ── Active line: fixed at center, bright & bold ── */
  .lyrics-line.active .lyrics-text {
    color: white;
    font-weight: 700;
    font-size: 1.55rem;
    transform: scale(1.02);
    transform-origin: left center;
  }

  /* ── Passed lines: faded ── */
  .lyrics-line.passed .lyrics-text {
    opacity: 0.2;
    font-size: 1.05rem;
  }

  /* ── Upcoming lines: dimly visible ── */
  .lyrics-line.upcoming .lyrics-text {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.22);
  }

  /* ── Subtle glow behind the center line ── */
  .lyrics-center-glow {
    position: absolute;
    left: 10%;
    right: 10%;
    top: 50%;
    height: 60px;
    transform: translateY(-50%);
    background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Plain lyrics ── */
  .lyrics-plain {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 0;
    overflow-y: auto;
    width: 100%;
    height: 100%;
  }

  .lyrics-plain-line {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.6;
    text-align: left;
    padding: 4px 48px;
  }

  /* ── States (loading, error, empty) ── */
  .lyrics-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    min-height: 200px;
  }

  .lyrics-state-text {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.04em;
  }

  .lyrics-state-icon {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.15);
  }

  .lyrics-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-top-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    animation: lyrSpin 0.7s linear infinite;
  }

  @keyframes lyrSpin {
    to { transform: rotate(360deg); }
  }

  .lyrics-retry-btn {
    margin-top: 4px;
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .lyrics-retry-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: white;
  }
</style>
