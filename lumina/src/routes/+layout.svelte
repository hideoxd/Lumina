<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { applyTheme, loadThemeFromStorage } from '$lib/stores/theme';
  import { glassEffectsEnabled } from '$lib/stores/ui';

  let { children } = $props();
  let mounted = $state(false);

  onMount(() => {
    // Apply last used theme (or default)
    applyTheme(loadThemeFromStorage());
    mounted = true;
  });

  $effect(() => {
    document.documentElement.setAttribute('data-glass', $glassEffectsEnabled ? 'on' : 'off');
  });
</script>

<!-- Global noise texture overlay for Liquid Glass effect -->
<div class="noise-overlay" aria-hidden="true"></div>

{#if mounted}
  <div class="app-root" class:mounted>
    {@render children()}
  </div>
{:else}
  <!-- Splash screen while app initializes -->
  <div class="splash-screen">
    <div class="splash-logo">
      <div class="splash-icon">
        <svg width="72" height="72" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-primary)" />
              <stop offset="100%" stop-color="var(--accent-secondary)" />
            </linearGradient>
            <filter id="splashGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <!-- Outer ring -->
          <circle cx="32" cy="32" r="28" stroke="url(#logoGrad)" stroke-width="2" fill="none" opacity="0.3" />
          <!-- Middle ring -->
          <circle cx="32" cy="32" r="20" stroke="url(#logoGrad)" stroke-width="1.5" fill="none" opacity="0.5" />
          <!-- Inner circle with glow -->
          <circle cx="32" cy="32" r="14" fill="url(#logoGrad)" opacity="0.8" filter="url(#splashGlow)" />
          <!-- Play triangle -->
          <path d="M27 23L42 32L27 41Z" fill="white" opacity="0.9" />
        </svg>
      </div>
      <span class="splash-text">Lumina</span>
    </div>
  </div>
{/if}

<style>
  .app-root {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .app-root.mounted {
    opacity: 1;
  }

  .splash-screen {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }

  .splash-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .splash-icon {
    animation: breathe 2s ease-in-out infinite;
  }

  .splash-text {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
