<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { youtubeApiKeyStore } from '$lib/stores/api';

  import { settingsOpen } from '$lib/stores/ui';

  function close() {
    settingsOpen.set(false);
  }
</script>

<Modal open={$settingsOpen} title="Settings" size="sm" onClose={close}>
  <div class="stack">
    <Card padding="lg" radius="xl">
      <h3 class="section">YouTube Integration</h3>
      <p class="hint">Masked YouTube API key for searching and streaming songs. Stored securely in your browser.</p>

      <div class="control" style="margin-top: 8px;">
        <div class="label" style="margin-bottom: 6px;">API Key</div>
        <input
          type="password"
          style="width: 100%; padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s ease;"
          placeholder="Enter your secret YouTube API Key (AIzaSy...)"
          bind:value={$youtubeApiKeyStore}
        />
      </div>
    </Card>
  </div>
</Modal>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section {
    font-size: var(--text-md);
    font-weight: 800;
    letter-spacing: -0.01em;
    margin-bottom: var(--space-2);
  }

  .hint {
    color: var(--text-tertiary);
    font-size: var(--text-xs);
    margin-bottom: var(--space-3);
    line-height: 1.5;
  }

  .control {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 800;
    color: var(--text-tertiary);
  }
</style>
