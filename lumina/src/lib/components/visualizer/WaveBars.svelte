<script lang="ts">
  import type { Track } from '$lib/types';
  import { playerState, isPlaying } from '$lib/stores/player';

  let {
    track = null,
    bars = 64,
    class: className = '',
    ambient = false,
  }: { track?: Track | null; bars?: number; class?: string; ambient?: boolean } = $props();

  let heights = $state<number[]>([]);
  let time = $state(0);
  let animId: number | null = null;

  function seedFromString(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function lcg(seed: number) {
    let x = seed >>> 0;
    return () => {
      x = (Math.imul(1664525, x) + 1013904223) >>> 0;
      return x / 2 ** 32;
    };
  }

  // Generate base pattern from track ID
  let basePattern = $derived((() => {
    const id = track?.id ?? 'none';
    const rand = lcg(seedFromString(id));
    const arr: number[] = [];
    for (let i = 0; i < bars; i++) {
      const r = rand();
      const freq = Math.sin((i / bars) * Math.PI) * 0.5 + 0.3;
      const v = freq * (0.25 + 0.75 * (1 - Math.abs(r * 2 - 1)));
      arr.push(v);
    }
    return arr;
  })());

  function tick() {
    time = performance.now() / 1000;
    const ps = $playerState;
    const active = ps.isPlaying && !ps.isPaused && !ps.isStopped;

    heights = basePattern.map((base, i) => {
      const phase = (i / bars) * Math.PI * 2;
      const wave1 = Math.sin(time * 0.9 + phase * 2) * 0.08;
      const wave2 = Math.sin(time * 1.7 + phase * 3.5) * 0.06;
      const wave3 = Math.sin(time * 0.3 + phase * 0.7) * 0.12;
      const pulse = active
        ? 0.7 + 0.3 * Math.abs(Math.sin(time * 0.5 + phase))
        : 0.3 + 0.1 * Math.sin(time * 0.2 + phase);
      const freq = Math.sin((i / bars) * Math.PI) * 0.35 + 0.15;
      return Math.max(0.02, Math.min(1, (base + wave1 + wave2 + wave3) * pulse + freq));
    });

    animId = requestAnimationFrame(tick);
  }

  $effect(() => {
    animId = requestAnimationFrame(tick);
    return () => { if (animId !== null) cancelAnimationFrame(animId); };
  });
</script>

<div class="wave {className}" class:ambient class:playing={$isPlaying}>
  {#each heights as v, i}
    <div
      class="bar"
      style="--h: {Math.round(v * 100)}%; --d: {i * 6}ms;"
      aria-hidden="true"
    ></div>
  {/each}
</div>

<style>
  .wave {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 48px;
    overflow: hidden;
  }

  .wave.ambient {
    height: 100%;
    width: 100%;
    gap: 3px;
    justify-content: center;
    align-items: center;
  }

  .bar {
    width: 4px;
    min-height: 2px;
    height: var(--h);
    max-height: 100%;
    border-radius: 999px;
    background: linear-gradient(
      180deg,
      hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.85),
      hsla(calc(var(--accent-h) + 45), 90%, 60%, 0.4)
    );
    box-shadow: 0 0 8px var(--accent-glow);
    opacity: 0.6;
    transform-origin: bottom;
    transition: height 60ms linear;
    will-change: height;
  }

  .playing .bar {
    opacity: 0.85;
  }

  .ambient .bar {
    width: 6px;
    border-radius: 999px;
    opacity: 0.2;
    transition: height 80ms ease, opacity 200ms ease;
  }

  .ambient.playing .bar {
    opacity: 0.35;
  }
</style>
