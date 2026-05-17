<!--
  Icon — Inline SVG icon component with common music player icons
  Usage: <Icon name="play" size={20} />
-->
<script lang="ts">
  interface Props {
    name: string;
    size?: number;
    color?: string;
    class?: string;
    strokeWidth?: number;
  }

  let {
    name,
    size = 18,
    color = 'currentColor',
    class: className = '',
    strokeWidth = 1.8,
  }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-{name} {className}"
  aria-hidden="true"
>
  {#if name === 'play'}
    <polygon points="6 3 20 12 6 21 6 3" fill={color} stroke="none" />
  {:else if name === 'pause'}
    <rect x="5" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
    <rect x="15" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
  {:else if name === 'skip-forward'}
    <polygon points="5 4 15 12 5 20 5 4" fill={color} stroke="none" />
    <line x1="19" y1="5" x2="19" y2="19" stroke={color} stroke-width="2.5" />
  {:else if name === 'skip-back'}
    <polygon points="19 20 9 12 19 4 19 20" fill={color} stroke="none" />
    <line x1="5" y1="19" x2="5" y2="5" stroke={color} stroke-width="2.5" />
  {:else if name === 'shuffle'}
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  {:else if name === 'repeat'}
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  {:else if name === 'repeat-1'}
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    <text x="12" y="15" font-size="8" fill={color} stroke="none" text-anchor="middle" font-weight="700">1</text>
  {:else if name === 'volume-2'}
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke={color} />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  {:else if name === 'volume-1'}
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke={color} />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  {:else if name === 'volume-x'}
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none" stroke={color} />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  {:else if name === 'music'}
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="none" />
    <circle cx="18" cy="16" r="3" fill="none" />
  {:else if name === 'disc'}
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
  {:else if name === 'users'}
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  {:else if name === 'list'}
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  {:else if name === 'heart'}
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  {:else if name === 'heart-filled'}
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={color} />
  {:else if name === 'clock'}
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  {:else if name === 'settings'}
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  {:else if name === 'plus'}
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  {:else if name === 'folder'}
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  {:else if name === 'folder-plus'}
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  {:else if name === 'x'}
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  {:else if name === 'minus'}
    <line x1="5" y1="12" x2="19" y2="12" />
  {:else if name === 'maximize'}
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  {:else if name === 'minimize'}
    <line x1="5" y1="12" x2="19" y2="12" />
  {:else if name === 'chevron-left'}
    <polyline points="15 18 9 12 15 6" />
  {:else if name === 'chevron-right'}
    <polyline points="9 18 15 12 9 6" />
  {:else if name === 'chevron-down'}
    <polyline points="6 9 12 15 18 9" />
  {:else if name === 'menu'}
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  {:else if name === 'queue'}
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  {:else if name === 'more-horizontal'}
    <circle cx="12" cy="12" r="1" fill={color} />
    <circle cx="19" cy="12" r="1" fill={color} />
    <circle cx="5" cy="12" r="1" fill={color} />
  {:else if name === 'sun'}
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  {:else if name === 'moon'}
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  {:else if name === 'grid'}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  {:else if name === 'list-view'}
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <rect x="3" y="4" width="2" height="4" rx="0.5" fill={color} stroke="none" />
    <rect x="3" y="10" width="2" height="4" rx="0.5" fill={color} stroke="none" />
    <rect x="3" y="16" width="2" height="4" rx="0.5" fill={color} stroke="none" />
  {:else if name === 'waveform'}
    <rect x="2" y="10" width="2" height="4" rx="1" fill={color} stroke="none" />
    <rect x="6" y="6" width="2" height="12" rx="1" fill={color} stroke="none" />
    <rect x="10" y="8" width="2" height="8" rx="1" fill={color} stroke="none" />
    <rect x="14" y="4" width="2" height="16" rx="1" fill={color} stroke="none" />
    <rect x="18" y="7" width="2" height="10" rx="1" fill={color} stroke="none" />
    <rect x="22" y="9" width="2" height="6" rx="1" fill={color} stroke="none" />
  {:else if name === 'edit'}
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  {:else if name === 'pin'}
    <path d="M12 2L12 22" />
    <path d="M17 7L12 2L7 7" />
  {:else if name === 'youtube'}
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  {:else if name === 'download'}
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  {:else}
    <!-- Fallback: question mark -->
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.5" fill={color} />
  {/if}
</svg>

<style>
  .icon {
    flex-shrink: 0;
    transition: transform var(--duration-fast) var(--ease-out-quart);
  }
</style>
