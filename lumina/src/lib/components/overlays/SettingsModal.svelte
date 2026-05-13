<script lang="ts">
  import GlassModal from '$lib/components/glass/GlassModal.svelte';
  import GlassCard from '$lib/components/glass/GlassCard.svelte';
  import GlassButton from '$lib/components/glass/GlassButton.svelte';
  import GlassSlider from '$lib/components/glass/GlassSlider.svelte';
  import GlassToggle from '$lib/components/glass/GlassToggle.svelte';

  import {
    activeTheme,
    applyPreset,
    builtInPresets,
    setAccentHue,
    setAccentLightness,
    setAccentSaturation,
    setAnimationSpeed,
    setBorderRadius,
    setGlassBlur,
    setGlassOpacity,
    setNoiseOpacity,
    toggleMode,
  } from '$lib/stores/theme';

  import { ambientEnabled, glassEffectsEnabled, miniPlayerMode, settingsOpen } from '$lib/stores/ui';

  import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

  const appWindow = getCurrentWindow();
  let lastSize: { width: number; height: number } | null = null;

  function close() {
    settingsOpen.set(false);
  }

  async function toggleMiniPlayer(checked: boolean) {
    if (checked) {
      try {
        const size = await appWindow.innerSize();
        lastSize = { width: size.width, height: size.height };
      } catch {
        lastSize = null;
      }

      await appWindow.setAlwaysOnTop(true);
      await appWindow.setSize(new LogicalSize(420, 140));
      miniPlayerMode.set(true);
    } else {
      await appWindow.setAlwaysOnTop(false);
      if (lastSize) {
        await appWindow.setSize(new LogicalSize(lastSize.width, lastSize.height));
      }
      miniPlayerMode.set(false);
    }
  }
</script>

<GlassModal open={$settingsOpen} title="Settings" size="lg" onClose={close}>
  <div class="grid">
    <GlassCard padding="lg" radius="xl">
      <h3 class="section">Theme</h3>
      <p class="hint">Pick a preset, then fine-tune. Changes apply instantly.</p>

      <div class="preset-row">
        {#each builtInPresets as preset (preset.id)}
          <button
            class="preset"
            class:active={preset.id === $activeTheme.id}
            onclick={() => applyPreset(preset)}
            title={preset.name}
          >
            <span class="dot" style="background: hsl({preset.accentHue}, {preset.accentSaturation}%, {preset.accentLightness}%);"></span>
            <span class="name">{preset.name}</span>
            <span class="mode">{preset.mode}</span>
          </button>
        {/each}
      </div>

      <div class="row">
        <GlassButton variant="default" size="sm" onclick={() => toggleMode()}>
          Toggle {($activeTheme.mode === 'dark') ? 'Light' : 'Dark'} Mode
        </GlassButton>
      </div>
    </GlassCard>

    <GlassCard padding="lg" radius="xl">
      <h3 class="section">Accent</h3>

      <div class="control">
        <div class="label">Hue</div>
        <GlassSlider
          value={$activeTheme.accentHue}
          min={0}
          max={360}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}°`}
          oninput={(v) => setAccentHue(v)}
        />
      </div>

      <div class="control">
        <div class="label">Saturation</div>
        <GlassSlider
          value={$activeTheme.accentSaturation}
          min={0}
          max={100}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}%`}
          oninput={(v) => setAccentSaturation(v)}
        />
      </div>

      <div class="control">
        <div class="label">Lightness</div>
        <GlassSlider
          value={$activeTheme.accentLightness}
          min={0}
          max={100}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}%`}
          oninput={(v) => setAccentLightness(v)}
        />
      </div>
    </GlassCard>

    <GlassCard padding="lg" radius="xl">
      <h3 class="section">Glass</h3>

      <div class="control">
        <div class="label">Blur</div>
        <GlassSlider
          value={$activeTheme.glassBlur}
          min={0}
          max={64}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}px`}
          oninput={(v) => setGlassBlur(v)}
        />
      </div>

      <div class="control">
        <div class="label">Opacity</div>
        <GlassSlider
          value={$activeTheme.glassOpacity * 100}
          min={5}
          max={92}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}%`}
          oninput={(v) => setGlassOpacity(v / 100)}
        />
      </div>

      <div class="control">
        <div class="label">Noise</div>
        <GlassSlider
          value={$activeTheme.noiseOpacity * 100}
          min={0}
          max={12}
          step={0.5}
          size="md"
          showTooltip
          formatTooltip={(v) => `${v.toFixed(1)}%`}
          oninput={(v) => setNoiseOpacity(v / 100)}
        />
      </div>

      <div class="control">
        <div class="label">Corner radius</div>
        <GlassSlider
          value={$activeTheme.borderRadius}
          min={8}
          max={28}
          step={1}
          size="md"
          showTooltip
          formatTooltip={(v) => `${Math.round(v)}px`}
          oninput={(v) => setBorderRadius(v)}
        />
      </div>

      <div class="toggles">
        <GlassToggle
          checked={$glassEffectsEnabled}
          label="Glass effects"
          description="Disabling removes blur for lower-end machines."
          onchange={(v) => glassEffectsEnabled.set(v)}
        />
      </div>
    </GlassCard>

    <GlassCard padding="lg" radius="xl">
      <h3 class="section">Motion & Layout</h3>

      <div class="control">
        <div class="label">Animation speed</div>
        <GlassSlider
          value={$activeTheme.animationSpeed}
          min={0.5}
          max={2}
          step={0.05}
          size="md"
          showTooltip
          formatTooltip={(v) => `${v.toFixed(2)}×`}
          oninput={(v) => setAnimationSpeed(v)}
        />
      </div>

      <div class="toggles">
        <GlassToggle
          checked={$ambientEnabled}
          label="Ambient background"
          description="The floating orbs behind content."
          onchange={(v) => ambientEnabled.set(v)}
        />

        <GlassToggle
          checked={$miniPlayerMode}
          label="Mini player mode"
          description="Shrinks the window and sets Always-on-top."
          onchange={(v) => void toggleMiniPlayer(v)}
        />
      </div>
    </GlassCard>
  </div>
</GlassModal>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
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

  .preset-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .preset {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px 10px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    background: hsla(0, 0%, 100%, 0.03);
    color: var(--text-primary);
    transition:
      border-color var(--duration-fast) var(--ease-out-quart),
      background var(--duration-fast) var(--ease-out-quart),
      transform var(--duration-fast) var(--ease-out-quart);
  }

  .preset:hover {
    background: hsla(0, 0%, 100%, 0.05);
    border-color: var(--glass-border-hover);
    transform: translateY(-1px);
  }

  .preset.active {
    border-color: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.35);
    background: var(--accent-gradient-subtle);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 14px var(--accent-glow);
    flex-shrink: 0;
  }

  .name {
    font-weight: 700;
    font-size: var(--text-sm);
    flex: 1;
    text-align: left;
  }

  .mode {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .control {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 800;
    color: var(--text-tertiary);
  }

  .row {
    margin-top: var(--space-3);
  }

  .toggles {
    margin-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
</style>
