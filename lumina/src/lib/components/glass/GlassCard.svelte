<!--
  GlassCard — Core glass surface component
  Usage: <GlassCard padding="lg" interactive hover>content</GlassCard>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    interactive?: boolean;
    accent?: boolean;
    glow?: boolean;
    class?: string;
    style?: string;
    onclick?: (e: MouseEvent) => void;
    ondblclick?: (e: MouseEvent) => void;
  }

  let {
    children,
    padding = 'md',
    radius = 'lg',
    interactive = false,
    accent = false,
    glow = false,
    class: className = '',
    style = '',
    onclick,
    ondblclick,
  }: Props = $props();

  let isClickable = $derived(!!onclick || !!ondblclick);
  let isInteractive = $derived(interactive || isClickable);

  const paddingMap: Record<string, string> = {
    none: '0',
    xs: 'var(--space-2)',
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)',
  };

  const radiusMap: Record<string, string> = {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
  };

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (onclick) {
      onclick(new MouseEvent('click'));
    } else if (ondblclick) {
      ondblclick(new MouseEvent('dblclick'));
    }
  }
</script>

{#if isClickable}
  <div
    class="glass-card {isInteractive ? 'glass-interactive' : ''} {accent ? 'glass-accent' : ''} {glow ? 'glass-glow' : ''} {className}"
    style="padding: {paddingMap[padding]}; border-radius: {radiusMap[radius]}; {style}"
    role="button"
    tabindex="0"
    onclick={onclick}
    ondblclick={ondblclick}
    onkeydown={handleKeydown}
  >
    {@render children()}
  </div>
{:else}
  <div
    class="glass-card {isInteractive ? 'glass-interactive' : ''} {accent ? 'glass-accent' : ''} {glow ? 'glass-glow' : ''} {className}"
    style="padding: {paddingMap[padding]}; border-radius: {radiusMap[radius]}; {style}"
  >
    {@render children()}
  </div>
{/if}

<style>
  .glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm), var(--shadow-inset);
    position: relative;
    overflow: hidden;
    text-align: left;
  }

  /* Inner light edge */
  .glass-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      hsla(0, 0%, 100%, 0.05) 0%,
      transparent 40%
    );
    pointer-events: none;
  }

  /* Interactive states */
  .glass-interactive {
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart),
      transform var(--duration-fast) var(--ease-out-quart);
  }

  .glass-interactive:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--shadow-md), var(--shadow-inset);
  }

  .glass-interactive:active {
    background: var(--glass-bg-active);
    transform: scale(0.985);
  }

  /* Accent border variant */
  .glass-accent {
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.2);
  }

  .glass-accent:hover {
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.35);
  }

  /* Glow effect */
  .glass-glow {
    box-shadow: var(--shadow-md), var(--shadow-glow);
  }

  .glass-glow:hover {
    box-shadow: var(--shadow-lg), var(--shadow-glow-lg);
  }
</style>
