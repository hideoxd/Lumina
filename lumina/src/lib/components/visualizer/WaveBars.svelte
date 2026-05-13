<script lang="ts">
  import type { Track } from '$lib/types';

  export interface Props {
    track: Track | null;
    playing?: boolean;
    bars?: number;
    class?: string;
  }

  let {
    track,
    playing = false,
    bars = 48,
    class: className = '',
  }: Props = $props();

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

  let pattern = $derived((() => {
    const id = track?.id ?? 'none';
    const rand = lcg(seedFromString(id));

    const arr: number[] = [];
    for (let i = 0; i < bars; i++) {
      // Bias toward mid heights so it looks like a real waveform
      const r = rand();
      const v = 0.22 + 0.78 * (1 - Math.abs(r * 2 - 1));
      arr.push(v);
    }
    return arr;
  })());
</script>

<div class="wave {className}" class:playing>
  {#each pattern as v, i}
    <div
      class="bar"
      style="--h: {Math.round(v * 100)}%; --d: {i * 12}ms;"
      aria-hidden="true"
    ></div>
  {/each}
</div>

<style>
  .wave {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 54px;
    padding: 10px 12px;
    border-radius: var(--radius-xl);
    background: hsla(0, 0%, 100%, 0.03);
    border: 1px solid var(--glass-border);
    overflow: hidden;
  }

  .bar {
    width: 3px;
    height: var(--h);
    max-height: 100%;
    border-radius: 999px;
    background: linear-gradient(
      180deg,
      hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.9),
      hsla(calc(var(--accent-h) + 40), 90%, 60%, 0.55)
    );
    box-shadow: 0 0 10px var(--accent-glow);
    opacity: 0.75;
    transform-origin: bottom;
  }

  .playing .bar {
    animation: bounce 900ms var(--ease-out-quart) infinite;
    animation-delay: var(--d);
  }

  @keyframes bounce {
    0%, 100% {
      transform: scaleY(0.55);
      opacity: 0.6;
    }
    50% {
      transform: scaleY(1.12);
      opacity: 0.95;
    }
  }
</style>
