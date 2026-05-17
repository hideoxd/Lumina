<!--
  Slider — Premium slider with glass track and glowing thumb
  Usage: <Slider bind:value min={0} max={100} />
-->
<script lang="ts">
  interface Props {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
    formatTooltip?: (value: number) => string;
    class?: string;
    oninput?: (value: number) => void;
    onchange?: (value: number) => void;
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    size = 'md',
    showTooltip = false,
    formatTooltip = (v: number) => String(Math.round(v)),
    class: className = '',
    oninput,
    onchange,
  }: Props = $props();

  let dragging = $state(false);
  let hovered = $state(false);

  $effect(() => {
    // Clamp value
    if (value < min) value = min;
    if (value > max) value = max;
  });

  let fillPercent = $derived(((value - min) / (max - min)) * 100);

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseFloat(target.value);
    oninput?.(value);
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseFloat(target.value);
    onchange?.(value);
  }
</script>

<div
  class="glass-slider size-{size} {className}"
  class:dragging
  class:hovered
  role="group"
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
>
  <!-- Track background -->
  <div class="track">
    <div class="track-fill" style="width: {fillPercent}%"></div>
    <div class="track-glow" style="width: {fillPercent}%"></div>
  </div>

  <!-- Tooltip -->
  {#if showTooltip && (dragging || hovered)}
    <div class="tooltip" style="left: {fillPercent}%">
      {formatTooltip(value)}
    </div>
  {/if}

  <!-- Native range input (invisible, for accessibility) -->
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    class="range-input"
    oninput={handleInput}
    onchange={handleChange}
    onmousedown={() => dragging = true}
    onmouseup={() => dragging = false}
    ontouchstart={() => dragging = true}
    ontouchend={() => dragging = false}
  />
</div>

<style>
  .glass-slider {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  /* Track */
  .track {
    position: absolute;
    width: 100%;
    border-radius: var(--radius-full);
    background: hsla(0, 0%, 100%, 0.08);
    overflow: hidden;
    pointer-events: none;
  }

  .size-sm .track { height: 3px; }
  .size-md .track { height: 4px; }
  .size-lg .track { height: 6px; }

  .track-fill {
    height: 100%;
    background: var(--accent-gradient);
    border-radius: inherit;
    transition: width 0.05s linear;
  }

  .track-glow {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: inherit;
    background: var(--accent-gradient);
    filter: blur(6px);
    opacity: 0;
    transition: opacity var(--duration-normal) ease;
    pointer-events: none;
  }

  .hovered .track-glow,
  .dragging .track-glow {
    opacity: 0.5;
  }

  /* Range input (overlaid, invisible but functional) */
  .range-input {
    width: 100%;
    height: 24px;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    margin: 0;
    position: relative;
    z-index: 2;
  }

  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    border: none;
    box-shadow:
      0 0 0 2px hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.3),
      var(--shadow-sm);
    cursor: grab;
    transition:
      transform var(--duration-fast) var(--ease-out-back),
      box-shadow var(--duration-normal) ease;
    transform: scale(0);
  }

  .size-lg .range-input::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
  }

  .hovered .range-input::-webkit-slider-thumb,
  .dragging .range-input::-webkit-slider-thumb {
    transform: scale(1);
  }

  .dragging .range-input::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(1.2);
    box-shadow:
      0 0 0 3px hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.4),
      0 0 16px var(--accent-glow),
      var(--shadow-md);
  }

  .range-input::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    border: none;
    box-shadow:
      0 0 0 2px hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.3),
      var(--shadow-sm);
    cursor: grab;
  }

  .range-input::-moz-range-track {
    background: transparent;
    border: none;
  }

  /* Tooltip */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    padding: 3px 8px;
    background: var(--bg-elevated);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    pointer-events: none;
    animation: fadeIn var(--duration-fast) ease;
    box-shadow: var(--shadow-md);
  }
</style>
