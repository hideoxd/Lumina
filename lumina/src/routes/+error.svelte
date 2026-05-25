<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  let reloading = $state(false);
  let copied = $state(false);

  function handleReload() {
    reloading = true;
    window.location.href = '/';
  }

  function handleCopy() {
    if (!browser) return;
    const err = $page?.error;
    const text = [
      `Lumina Error Report`,
      `=====================`,
      `Code: ${err?.code || '500'}`,
      `URL:  ${window.location.href}`,
      ``,
      `Message:`,
      err?.message || '(no message)',
      ``,
      `Detail:`,
      (err as any)?.detail || '(no detail)',
      ``,
      `User Agent: ${navigator.userAgent}`,
      `Timestamp:  ${new Date().toISOString()}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }
</script>

<div class="error-page">
  <div class="error-card">
    <h1>Something went wrong</h1>
    <p>The app encountered an issue while loading.</p>
    {#if $page?.error?.message}
      <pre class="error-detail">{$page.error.message}</pre>
    {/if}
    {#if ($page?.error as any)?.detail}
      <pre class="error-detail stack">Detail: {($page.error as any).detail}</pre>
    {/if}
    <div class="btn-row">
      <button class="btn-primary" onclick={handleReload} disabled={reloading}>
        {reloading ? 'Reloading...' : 'Reload App'}
      </button>
      <button class="btn-secondary" onclick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Error'}
      </button>
    </div>
    <p class="hint">An alert dialog should also appear with the error details above.</p>
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
    margin: 0 0 12px 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
  }
  .error-detail.stack {
    color: #fb923c;
    font-size: 10px;
    max-height: 250px;
  }
  .btn-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 16px;
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
  .btn-secondary {
    padding: 10px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    color: #888;
    border: 1px solid rgba(255,255,255,0.2);
    transition: all 0.15s ease;
  }
  .btn-secondary:hover {
    color: #fff;
    border-color: rgba(255,255,255,0.4);
  }
  .hint {
    font-size: 11px;
    opacity: 0.4;
    margin: 0;
  }
</style>
