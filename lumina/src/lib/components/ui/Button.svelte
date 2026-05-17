<!--
  Button — Frosted glass button with multiple variants
  Usage: <Button variant="primary" icon="play" size="md">Label</Button>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    variant?: 'default' | 'primary' | 'ghost' | 'icon' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    style?: string;
    title?: string;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    children,
    variant = 'default',
    size = 'md',
    disabled = false,
    loading = false,
    class: className = '',
    style = '',
    title = '',
    onclick,
  }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (disabled || loading) return;
    const btn = e.currentTarget as HTMLElement;
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    onclick?.(e);
  }
</script>

<button
  class="glass-btn variant-{variant} size-{size} {className}"
  class:disabled
  class:loading
  {style}
  {title}
  {disabled}
  onclick={handleClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as any); }}
>
  {#if loading}
    <span class="spinner"></span>
  {/if}
  {#if children}
    <span class="btn-content" class:hidden={loading}>
      {@render children()}
    </span>
  {/if}
</button>

<style>
  .glass-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-sans);
    font-weight: 500;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);

    color: var(--text-primary);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart),
      transform var(--duration-fast) var(--ease-out-back),
      color var(--duration-fast) var(--ease-out-quart);
  }

  /* Inner light */
  .glass-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, hsla(0,0%,100%,0.06) 0%, transparent 50%);
    pointer-events: none;
    transition: opacity var(--duration-fast) ease;
  }

  .glass-btn:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  .glass-btn:active {
    transform: scale(0.94);
    background: var(--glass-bg-active);
  }

  /* Sizes */
  .size-xs {
    height: 28px;
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    border-radius: var(--radius-md);
  }

  .size-sm {
    height: 32px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
    border-radius: var(--radius-md);
  }

  .size-md {
    height: 36px;
    padding: 0 var(--space-4);
    font-size: var(--text-base);
    border-radius: var(--radius-lg);
  }

  .size-lg {
    height: 44px;
    padding: 0 var(--space-6);
    font-size: var(--text-md);
    border-radius: var(--radius-lg);
  }

  /* Variants */
  .variant-primary {
    background: var(--accent-gradient);
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.4);
    color: white;
    box-shadow: var(--shadow-sm), 0 0 16px var(--accent-glow);
  }

  .variant-primary:hover {
    box-shadow: var(--shadow-md), 0 0 28px var(--accent-glow);
    filter: brightness(1.1);
    transform: translateY(-2px) scale(1.02);
  }

  .variant-primary:active {
    transform: scale(0.95);
  }

  .variant-primary::after {
    background: linear-gradient(135deg, hsla(0,0%,100%,0.15) 0%, transparent 50%);
  }

  .variant-ghost {
    background: transparent;
    border-color: transparent;

  }

  .variant-ghost:hover {
    background: var(--glass-bg);
    border-color: var(--glass-border);
  }

  .variant-ghost::after {
    display: none;
  }

  .variant-icon {
    background: transparent;
    border-color: transparent;

    padding: 0;
    aspect-ratio: 1;
    border-radius: var(--radius-lg);
  }

  .variant-icon.size-xs { width: 28px; height: 28px; }
  .variant-icon.size-sm { width: 32px; height: 32px; }
  .variant-icon.size-md { width: 36px; height: 36px; }
  .variant-icon.size-lg { width: 44px; height: 44px; }

  .variant-icon:hover {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    transform: scale(1.1);
  }

  .variant-icon:active {
    transform: scale(0.9);
  }

  .variant-icon::after {
    display: none;
  }

  .variant-danger {
    border-color: hsla(0, 72%, 58%, 0.3);
    color: var(--error);
  }

  .variant-danger:hover {
    background: hsla(0, 72%, 58%, 0.12);
    border-color: hsla(0, 72%, 58%, 0.5);
  }

  /* Disabled */
  .disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Loading spinner */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .ripple {
    position: absolute;
    border-radius: 50%;
    background: hsla(0, 0%, 100%, 0.25);
    pointer-events: none;
    animation: rippleAnim 600ms var(--ease-out-expo) forwards;
  }

  @keyframes rippleAnim {
    from {
      transform: scale(0);
      opacity: 0.6;
    }
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
