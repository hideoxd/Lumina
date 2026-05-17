/* ============================================================
   Lumina — Theme Store
   Manages theme, accent color, glass settings, presets
   ============================================================ */
import { writable, derived } from 'svelte/store';
import type { ThemePreset } from '$lib/types';
import { readJson, writeJson } from '$lib/utils/persist';

const STORAGE_KEY = 'lumina.theme.active';

/** Default dark theme */
const defaultDarkTheme: ThemePreset = {
  id: 'default-dark',
  name: 'Aurora Blue',
  mode: 'dark',
  accentHue: 210,
  accentSaturation: 90,
  accentLightness: 60,
  glassBlur: 24,
  glassOpacity: 0.45,
  noiseOpacity: 0.03,
  animationSpeed: 1,
  borderRadius: 16,
};

/** Default light theme */
const defaultLightTheme: ThemePreset = {
  id: 'default-light',
  name: 'Crystal Sky',
  mode: 'light',
  accentHue: 210,
  accentSaturation: 82,
  accentLightness: 54,
  glassBlur: 20,
  glassOpacity: 0.65,
  noiseOpacity: 0.02,
  animationSpeed: 1,
  borderRadius: 16,
};

/** Built-in presets */
export const builtInPresets: ThemePreset[] = [
  defaultDarkTheme,
  defaultLightTheme,
  {
    id: 'ocean-dark',
    name: 'Deep Ocean',
    mode: 'dark',
    accentHue: 200,
    accentSaturation: 90,
    accentLightness: 58,
    glassBlur: 28,
    glassOpacity: 0.4,
    noiseOpacity: 0.04,
    animationSpeed: 1,
    borderRadius: 20,
  },
  {
    id: 'sunset-dark',
    name: 'Ember Sunset',
    mode: 'dark',
    accentHue: 15,
    accentSaturation: 90,
    accentLightness: 58,
    glassBlur: 22,
    glassOpacity: 0.5,
    noiseOpacity: 0.03,
    animationSpeed: 1.1,
    borderRadius: 14,
  },
  {
    id: 'emerald-dark',
    name: 'Neon Forest',
    mode: 'dark',
    accentHue: 155,
    accentSaturation: 85,
    accentLightness: 52,
    glassBlur: 20,
    glassOpacity: 0.42,
    noiseOpacity: 0.035,
    animationSpeed: 0.9,
    borderRadius: 12,
  },
  {
    id: 'rose-dark',
    name: 'Rosé Gold',
    mode: 'dark',
    accentHue: 340,
    accentSaturation: 80,
    accentLightness: 62,
    glassBlur: 26,
    glassOpacity: 0.48,
    noiseOpacity: 0.025,
    animationSpeed: 1,
    borderRadius: 18,
  },
];

/** Active theme preset */
export const activeTheme = writable<ThemePreset>(defaultDarkTheme);

/** User-created presets */
export const userPresets = writable<ThemePreset[]>([]);

/** Apply theme to CSS custom properties */
export function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;

  // Set dark/light mode
  root.setAttribute('data-theme', theme.mode);

  // Accent colors
  root.style.setProperty('--accent-h', String(theme.accentHue));
  root.style.setProperty('--accent-s', `${theme.accentSaturation}%`);
  root.style.setProperty('--accent-l', `${theme.accentLightness}%`);

  // Glass properties
  root.style.setProperty('--glass-blur', `${theme.glassBlur}px`);
  root.style.setProperty('--glass-noise-opacity', String(theme.noiseOpacity));

  // Radius scale (keep the whole system coherent)
  const r = Math.max(8, theme.borderRadius);
  root.style.setProperty('--radius-sm', `${Math.max(6, r - 8)}px`);
  root.style.setProperty('--radius-md', `${Math.max(8, r - 4)}px`);
  root.style.setProperty('--radius-lg', `${r}px`);
  root.style.setProperty('--radius-xl', `${r + 4}px`);
  root.style.setProperty('--radius-2xl', `${r + 8}px`);

  // Surface backgrounds (Solid colors, no glass)
  if (theme.mode === 'dark') {
    root.style.setProperty('--glass-bg', `hsl(0, 0%, 10%)`);
    root.style.setProperty('--glass-bg-hover', `hsl(0, 0%, 15%)`);
    root.style.setProperty('--glass-bg-active', `hsl(0, 0%, 20%)`);
  } else {
    root.style.setProperty('--glass-bg', `hsl(0, 0%, 98%)`);
    root.style.setProperty('--glass-bg-hover', `hsl(0, 0%, 94%)`);
    root.style.setProperty('--glass-bg-active', `hsl(0, 0%, 90%)`);
  }

  // Animation speed (scale durations)
  root.style.setProperty('--animation-speed-multiplier', String(theme.animationSpeed));
  const speed = Math.max(0.5, Math.min(2, theme.animationSpeed));
  const dur = (ms: number) => Math.round(ms * speed);
  root.style.setProperty('--duration-instant', `${dur(80)}ms`);
  root.style.setProperty('--duration-fast', `${dur(150)}ms`);
  root.style.setProperty('--duration-normal', `${dur(250)}ms`);
  root.style.setProperty('--duration-slow', `${dur(400)}ms`);
  root.style.setProperty('--duration-slower', `${dur(600)}ms`);

  activeTheme.set(theme);

  // Persist
  writeJson(STORAGE_KEY, theme);
}

/** Load last theme from storage (fallback to default). */
export function loadThemeFromStorage(): ThemePreset {
  const stored = readJson<ThemePreset>(STORAGE_KEY);
  if (!stored) return defaultDarkTheme;
  return {
    ...defaultDarkTheme,
    ...stored,
    mode: stored.mode ?? defaultDarkTheme.mode,
  };
}

/** Set accent hue */
export function setAccentHue(hue: number) {
  activeTheme.update((t) => {
    const updated = { ...t, accentHue: hue };
    applyTheme(updated);
    return updated;
  });
}

export function updateTheme(partial: Partial<ThemePreset>) {
  activeTheme.update((t) => {
    const updated = { ...t, ...partial };
    applyTheme(updated);
    return updated;
  });
}

export const isDarkMode = derived(activeTheme, ($t) => $t.mode === 'dark');

export function setAccentSaturation(saturation: number) {
  updateTheme({ accentSaturation: Math.max(0, Math.min(100, saturation)) });
}

export function setAccentLightness(lightness: number) {
  updateTheme({ accentLightness: Math.max(0, Math.min(100, lightness)) });
}

export function setGlassBlur(blur: number) {
  updateTheme({ glassBlur: Math.max(0, Math.min(64, blur)) });
}

export function setGlassOpacity(opacity: number) {
  updateTheme({ glassOpacity: Math.max(0.05, Math.min(0.92, opacity)) });
}

export function setNoiseOpacity(opacity: number) {
  updateTheme({ noiseOpacity: Math.max(0, Math.min(0.12, opacity)) });
}

export function setAnimationSpeed(speed: number) {
  updateTheme({ animationSpeed: Math.max(0.5, Math.min(2, speed)) });
}

export function setBorderRadius(radius: number) {
  updateTheme({ borderRadius: Math.max(8, Math.min(28, radius)) });
}

export function applyPreset(preset: ThemePreset) {
  applyTheme(preset);
}

/** Toggle dark/light mode */
export function toggleMode() {
  activeTheme.update((t) => {
    const newMode: ThemePreset['mode'] = t.mode === 'dark' ? 'light' : 'dark';
    const updated = { ...t, mode: newMode };
    applyTheme(updated);
    return updated;
  });
}
