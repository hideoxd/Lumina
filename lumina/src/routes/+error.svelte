<script lang="ts">
  import { page } from '$app/stores';

  let reloading = $state(false);

  function handleReload() {
    reloading = true;
    window.location.href = '/';
  }
</script>

<div class="error-page">
  <div class="error-card">
    <h1>Something went wrong</h1>
    <p>The app encountered an issue while loading.</p>
    {#if $page?.error?.message}
      <pre class="error-detail">{$page.error.message}</pre>
    {/if}
    <button class="btn-primary" onclick={handleReload} disabled={reloading}>
      {reloading ? 'Reloading...' : 'Reload App'}
    </button>
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
    margin: 0 0 24px 0;
  }
  .error-detail {
    text-align: left;
    font-size: 11px;
    color: #f87171;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px 16px;
    margin: 0 0 24px 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 150px;
    overflow-y: auto;
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
</style>
