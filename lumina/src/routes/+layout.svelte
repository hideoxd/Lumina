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

<!-- Background is now handled directly by the body/app-root solid colors -->

{#if mounted}
  <div class="app-root" class:mounted>
    {@render children()}
  </div>
{:else}
  <!-- Splash screen while app initializes -->
  <div class="splash-screen">
    <div class="splash-logo">
      <div class="splash-icon">
        <svg width="80" height="80" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-primary)" />
              <stop offset="100%" stop-color="var(--accent-secondary)" />
            </linearGradient>
            <linearGradient id="splashGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-primary)" />
              <stop offset="100%" stop-color="#666666" />
            </linearGradient>
          </defs>
          <!-- Outer ring -->
          <circle cx="64" cy="64" r="60" stroke="url(#splashGrad)" stroke-width="1.5" opacity="0.2" />
          <!-- Middle ring -->
          <circle cx="64" cy="64" r="46" stroke="url(#splashGrad)" stroke-width="1.5" opacity="0.35" />
          <!-- Inner filled circle -->
          <circle cx="64" cy="64" r="30" fill="url(#splashGrad)" opacity="0.9" />
          <!-- Play triangle -->
          <path d="M55 48L80 64L55 80Z" fill="var(--bg-primary)" opacity="0.95" />
          <!-- Ambient decoration dots -->
          <circle cx="64" cy="14" r="2.5" fill="url(#splashGrad2)" opacity="0.3" />
          <circle cx="64" cy="114" r="2.5" fill="url(#splashGrad2)" opacity="0.3" />
          <circle cx="14" cy="64" r="2.5" fill="url(#splashGrad2)" opacity="0.3" />
          <circle cx="114" cy="64" r="2.5" fill="url(#splashGrad2)" opacity="0.3" />
        </svg>
      </div>
      <span class="splash-text">Lumina</span>
      <span class="splash-tagline">Your music, illuminated.</span>
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
    gap: 12px;
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

  .splash-tagline {
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.2em;
    color: var(--text-tertiary);
    text-transform: uppercase;
    margin-top: -4px;
  }
</style>
