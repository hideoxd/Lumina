<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import {
    playerState,
    currentTrack,
    isPlaying,
    volume,
    setVolume,
    toggleShuffle,
    toggleRepeat
  } from '$lib/stores/player';
  import { playNext, playPrevious, togglePlayPause, seekToSeconds } from '$lib/stores/queue';
  import { queuePanelOpen, toggleQueue, nowPlayingFullscreen, miniPlayerMode } from '$lib/stores/ui';
  
  let progressStr = $derived(formatTime($playerState.position));
  let durationStr = $derived(formatTime($playerState.duration));
  
  function formatTime(s: number) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function handleProgressClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekToSeconds(percent * $playerState.duration);
  }

  function handleVolumeClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  }
</script>

<div class="player-pill">
  <div class="player-left">
    {#if $currentTrack}
      <div class="cover-art">
        {#if $currentTrack.artwork_path && ($currentTrack.artwork_path.startsWith('data:') || $currentTrack.artwork_path.startsWith('blob:'))}
          <img src={$currentTrack.artwork_path} alt="" />
        {:else}
          <div class="cover-placeholder">
            <Icon name="music" size={16} />
          </div>
        {/if}
      </div>
      <div class="track-info">
        <div class="track-title truncate">{$currentTrack.title}</div>
        <div class="track-artist truncate">{$currentTrack.artist}</div>
      </div>
    {/if}
  </div>

  <div class="player-center">
    <div class="player-controls">
      <button class="btn-icon" class:active={$playerState.isShuffled} onclick={toggleShuffle}>
        <Icon name="shuffle" size={14} />
      </button>
      <button class="btn-icon" onclick={() => void playPrevious()}>
        <Icon name="skip-back" size={16} />
      </button>
      
      <button class="btn-play" onclick={() => void togglePlayPause()}>
        <Icon name={$isPlaying ? 'pause' : 'play'} size={18} color="var(--bg-primary)" />
      </button>
      
      <button class="btn-icon" onclick={() => void playNext()}>
        <Icon name="skip-forward" size={16} />
      </button>
      <button class="btn-icon" class:active={$playerState.repeatMode !== 'off'} onclick={toggleRepeat}>
        <Icon name={$playerState.repeatMode === 'one' ? 'repeat-one' : 'repeat'} size={14} />
      </button>
    </div>

    <div class="progress-container">
      <span class="time">{progressStr}</span>
      <div
        class="progress-bar-wrapper"
        role="slider"
        aria-valuenow={$playerState.position}
        tabindex="0"
        onclick={handleProgressClick}
        onkeydown={(e) => {
          if (e.key === 'ArrowRight') seekToSeconds($playerState.position + 5);
          if (e.key === 'ArrowLeft') seekToSeconds($playerState.position - 5);
        }}
      >
        <div class="progress-bg">
          <div class="progress-fill" style="width: {$playerState.duration > 0 ? ($playerState.position / $playerState.duration) * 100 : 0}%"></div>
        </div>
      </div>
      <span class="time">{durationStr}</span>
    </div>
  </div>

  <div class="player-right">
    <button class="btn-icon" onclick={() => miniPlayerMode.set(true)} title="Mini Player">
      <Icon name="minimize" size={14} />
    </button>
    <button class="btn-icon" onclick={() => nowPlayingFullscreen.set(true)} title="Full Screen">
      <Icon name="maximize" size={14} />
    </button>
    <button class="btn-icon" class:active={$queuePanelOpen} onclick={toggleQueue} title="Queue">
      <Icon name="list" size={14} />
    </button>
    
    <div class="volume-container">
      <Icon name={$volume === 0 ? 'volume-x' : 'volume-2'} size={14} color="var(--text-secondary)" />
      <div
        class="progress-bar-wrapper volume-bar"
        role="slider"
        aria-valuenow={$volume}
        tabindex="0"
        onclick={handleVolumeClick}
        onkeydown={(e) => {
          if (e.key === 'ArrowRight') setVolume(Math.min(1, $volume + 0.1));
          if (e.key === 'ArrowLeft') setVolume(Math.max(0, $volume - 0.1));
        }}
      >
        <div class="progress-bg">
          <div class="progress-fill" style="width: {$volume * 100}%"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .player-pill {
    width: 100%;
    height: 72px;
    background: var(--bg-elevated);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px 0 8px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  }

  .player-left, .player-right {
    display: flex;
    align-items: center;
    min-width: 200px;
  }

  .player-left {
    gap: 12px;
  }

  .player-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .player-right {
    justify-content: flex-end;
    gap: 16px;
  }

  .cover-art {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--bg-primary);
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .cover-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .track-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .track-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .track-artist {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    transition: color 0.1s;
  }

  .btn-icon:hover, .btn-icon.active {
    color: var(--text-primary);
  }

  .btn-play {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--text-primary);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.1s;
    margin: 0 8px;
  }

  .btn-play:hover {
    transform: scale(1.05);
  }

  .player-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-container {
    width: 100%;
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .time {
    font-size: 10px;
    color: var(--text-tertiary);
    min-width: 32px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .progress-bar-wrapper {
    flex: 1;
    height: 12px;
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
  }

  .progress-bg {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--text-primary);
    position: absolute;
    left: 0;
    top: 0;
  }

  .progress-bar-wrapper:hover .progress-fill {
    background: var(--text-primary);
  }

  .volume-container {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100px;
  }

  .volume-bar {
    width: 100%;
  }
</style>
