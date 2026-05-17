<!--
  Modal — Premium modal with glass surface + blur backdrop
  Usage:
    <Modal open={open} title="Settings" onClose={() => open=false}>
      <div>...</div>
    </Modal>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';

  export interface Props {
    open: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: Snippet;
    footer?: Snippet;
    onClose?: () => void;
  }

  let {
    open,
    title = '',
    size = 'md',
    children,
    footer,
    onClose,
  }: Props = $props();

  const widthMap: Record<NonNullable<Props['size']>, string> = {
    sm: '520px',
    md: '720px',
    lg: '920px',
    xl: '1100px',
  };

  function close() {
    onClose?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') close();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target !== e.currentTarget) return;
    close();
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    class="backdrop"
    role="button"
    tabindex="0"
    aria-label="Close dialog"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
<div class="dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      tabindex="-1"
      style="max-width: {widthMap[size]}"
      onkeydown={(e) => e.stopPropagation()}
      onclick={(e) => e.stopPropagation()}
    >
      <Card padding="lg" radius="2xl" class="modal-surface" accent>
        <div class="header">
          <div class="title-row">
            <h2 class="title">{title}</h2>
          </div>
          <Button variant="icon" size="sm" title="Close" onclick={close}>
            <Icon name="x" size={16} />
          </Button>
        </div>

        <div class="content">
          {@render children()}
        </div>

        {#if footer}
          <div class="footer">
            {@render footer()}
          </div>
        {/if}
      </Card>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);

    background:
      radial-gradient(1200px 800px at 30% 20%, hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.10) 0%, transparent 60%),
      radial-gradient(900px 700px at 80% 80%, hsla(calc(var(--accent-h) + 60), 90%, 60%, 0.08) 0%, transparent 55%),
      hsla(0, 0%, 0%, 0.45);

    animation: fadeIn var(--duration-normal) var(--ease-out-quart) both;
  }

  :global([data-theme="light"]) .backdrop {
    background:
      radial-gradient(1200px 800px at 30% 20%, hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.12) 0%, transparent 60%),
      radial-gradient(900px 700px at 80% 80%, hsla(calc(var(--accent-h) + 60), 90%, 60%, 0.10) 0%, transparent 55%),
      hsla(0, 0%, 100%, 0.55);
  }

  .dialog {
    width: 100%;
    max-height: min(84vh, 920px);
    animation: fadeInScale var(--duration-slow) var(--ease-out-expo) both;
  }

  :global(.modal-surface) {
    max-height: inherit;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--glass-border);
  }

  .title {
    font-size: var(--text-lg);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .content {
    padding-top: var(--space-4);
    overflow: auto;
  }

  .footer {
    padding-top: var(--space-4);
    border-top: 1px solid var(--glass-border);
    margin-top: var(--space-4);
  }
</style>
