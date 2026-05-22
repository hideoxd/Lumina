import { writable } from 'svelte/store';
import { YOUTUBE_API_KEY as hardcodedKey } from '$lib/config/api';

const initialKey = (typeof window !== 'undefined' && localStorage.getItem('lumina_youtube_api_key')) || (hardcodedKey === 'YOUR_API_KEY_HERE' ? '' : hardcodedKey) || '';

export const youtubeApiKeyStore = writable<string>(initialKey);

if (typeof window !== 'undefined') {
  youtubeApiKeyStore.subscribe((val) => {
    if (val && val !== 'YOUR_API_KEY_HERE') {
      localStorage.setItem('lumina_youtube_api_key', val);
    }
  });
}

/** Helper to check if a valid API key is currently configured */
export function hasValidApiKey(key: string): boolean {
  return !!key && key.trim().length > 0 && key !== 'YOUR_API_KEY_HERE';
}
