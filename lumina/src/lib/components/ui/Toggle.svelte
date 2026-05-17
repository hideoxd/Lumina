<!--
  Toggle — Premium switch/toggle
  Usage: <Toggle bind:checked label="Ambient background" />
-->
<script lang="ts">
  export interface Props {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    description?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    label = '',
    description = '',
    class: className = '',
    onchange,
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<div class="toggle {className}" class:disabled>
  <button
    class="switch"
    role="switch"
    aria-checked={checked}
    onclick={toggle}
    disabled={disabled}
    title={label}
  >
    <span class="knob" class:on={checked}></span>
  </button>

  {#if label}
    <div class="meta">
      <div class="label">{label}</div>
      {#if description}
        <div class="desc">{description}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .switch {
    width: 46px;
    height: 26px;
    border-radius: var(--radius-full);
    background: hsla(0, 0%, 100%, 0.08);
    border: 1px solid var(--glass-border);
    position: relative;
    padding: 0;
    flex-shrink: 0;


    transition:
      background var(--duration-fast) var(--ease-out-quart),
      border-color var(--duration-fast) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart);
  }

  .switch:hover {
    border-color: var(--glass-border-hover);
  }

  .knob {
    position: absolute;
    top: 50%;
    left: 3px;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: hsla(0, 0%, 100%, 0.85);
    box-shadow: var(--shadow-sm);

    transition:
      transform var(--duration-fast) var(--ease-out-back),
      background var(--duration-fast) var(--ease-out-quart),
      box-shadow var(--duration-normal) var(--ease-out-quart);
  }

  .knob.on {
    transform: translate(20px, -50%);
    background: linear-gradient(
      135deg,
      hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.95),
      hsla(calc(var(--accent-h) + 50), 90%, 60%, 0.95)
    );
    box-shadow: var(--shadow-sm), 0 0 18px var(--accent-glow);
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .desc {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    line-height: 1.4;
  }

  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
