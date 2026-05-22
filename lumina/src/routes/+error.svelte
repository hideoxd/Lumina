<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let reloading = $state(false);
  let countdown = $state(5);
  let autoRedirect = $state(true);

  function handleReload() {
    reloading = true;
    // Use SvelteKit navigation instead of hard reload to avoid losing state
    goto('/', { replaceState: true, invalidateAll: true }).catch(() => {
      // Fallback to hard reload if SvelteKit navigation fails
      window.location.href = '/';
    });
  }

  onMount(() => {
    // Auto-redirect to dashboard after countdown
    const interval = setInterval(() => {
      if (!autoRedirect) return;
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(interval);
        handleReload();
      }
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div class="error-page">
  <div class="error-card">
    <h1>Something went wrong</h1>
    <p>The app encountered an issue while loading.</p>
    <button class="btn-primary" onclick={handleReload} disabled={reloading}>
      {reloading ? 'Reloading...' : `Reload App${autoRedirect ? ` (${countdown}s)` : ''}`}
    </button>
    {#if !reloading}
      <button class="btn-link" onclick={() => { autoRedirect = false; }}>
        Cancel auto-reload
      </button>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
  }
  .error-page {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    color: #EDEDED;
    font-family: system-ui, sans-serif;
  }
  .error-card {
    text-align: center;
    max-width: 420px;
    padding: 48px;
  }
  h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #fff;
  }
  p {
    font-size: 14px;
    color: #888;
    margin: 0 0 32px 0;
  }
  .btn-primary {
    padding: 10px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: #fff;
    color: #000;
    border: none;
    transition: all 0.15s ease;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255,255,255,0.15);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-link {
    display: block;
    margin-top: 16px;
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
  }
  .btn-link:hover {
    color: #999;
  }
</style>
