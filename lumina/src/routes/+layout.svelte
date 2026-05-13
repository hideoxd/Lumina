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
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="hsl(270, 95%, 65%)" />
              <stop offset="100%" stop-color="hsl(320, 90%, 60%)" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" stroke="url(#logoGrad)" stroke-width="2.5" fill="none" opacity="0.3" />
          <circle cx="32" cy="32" r="20" stroke="url(#logoGrad)" stroke-width="2" fill="none" opacity="0.5" />
          <circle cx="32" cy="32" r="12" fill="url(#logoGrad)" opacity="0.8" />
          <path d="M28 24L40 32L28 40Z" fill="white" opacity="0.9" />
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
