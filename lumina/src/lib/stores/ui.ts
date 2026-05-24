/* ============================================================
   Lumina — UI Store
   Manages sidebar state, current view, panels, mini player
   ============================================================ */
import { writable, derived } from 'svelte/store';
import type { ViewMode, NavItem } from '$lib/types';

/** Current active view */
export const currentView = writable<ViewMode>('tracks');

/** Sidebar collapsed state */
export const sidebarCollapsed = writable(false);

/** Queue panel visible */
export const queuePanelOpen = writable(false);

/** Now playing fullscreen view */
export const nowPlayingFullscreen = writable(false);

/** Settings modal open */
export const settingsOpen = writable(false);

/** Mini player mode */
export const miniPlayerMode = writable(false);

/** Last window size before mini player */
export const lastWindowSize = writable({ width: 1280, height: 800 });

/** Ambient background orbs enabled */
export const ambientEnabled = writable(true);

/** Reduce expensive glass effects (performance mode) */
export const glassEffectsEnabled = writable(true);

/** Search query */
export const searchQuery = writable('');

/** Search focused */
export const searchFocused = writable(false);

/** Navigation items */
export const navItems: NavItem[] = [
  { id: 'tracks', label: 'All Tracks', icon: 'music', view: 'tracks' },
  { id: 'albums', label: 'Albums', icon: 'disc', view: 'albums' },
  { id: 'artists', label: 'Artists', icon: 'users', view: 'artists' },
  { id: 'playlists', label: 'Playlists', icon: 'list', view: 'playlists' },
  { id: 'favorites', label: 'Favorites', icon: 'heart', view: 'favorites' },
  { id: 'recent', label: 'Recently Played', icon: 'clock', view: 'recent' },
];

/** Toggle sidebar collapse */
export function toggleSidebar() {
  sidebarCollapsed.update((v) => !v);
}

/** Toggle queue panel */
export function toggleQueue() {
  queuePanelOpen.update((v) => !v);
}

/** Active playlist ID (when viewing a specific playlist) */
export const activePlaylistId = writable<string | null>(null);

/** Create playlist modal visible */
export const showCreatePlaylist = writable(false);

/** Navigate to view */
export function navigateTo(view: ViewMode) {
  currentView.set(view);
  nowPlayingFullscreen.set(false);
}
