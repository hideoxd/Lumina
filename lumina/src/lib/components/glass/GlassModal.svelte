<!--
  GlassModal — Premium modal with glass surface + blur backdrop
  Usage:
    <GlassModal open={open} title="Settings" onClose={() => open=false}>
      <div>...</div>
    </GlassModal>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import GlassCard from '$lib/components/glass/GlassCard.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
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
    if (e.key === 'Escape') close();
  }
</script>

{#if open}
  <svelte:window onkeydown={onKeydown} />

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={close}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
      onclick={(e) => e.stopPropagation()}
      style="max-width: {widthMap[size]}"
    >
      <GlassCard padding="lg" radius="2xl" class="modal-surface" accent>
        <div class="header">
          <div class="title-row">
            <h2 class="title">{title}</h2>
          </div>
          <GlassButton variant="icon" size="sm" title="Close" onclick={close}>
            <Icon name="x" size={16} />
          </GlassButton>
        </div>

        <div class="content">
          {@render children()}
        </div>

        {#if footer}
          <div class="footer">
            {@render footer()}
          </div>
        {/if}
      </GlassCard>
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

    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
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

  .modal-surface {
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
