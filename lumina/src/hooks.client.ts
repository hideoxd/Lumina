import type { HandleClientError } from '@sveltejs/kit';

/**
 * SvelteKit client-side error handler.
 * Returning a custom error object prevents the default behavior and
 * allows the app to degrade gracefully instead of showing the error page.
 */
export const handleError: HandleClientError = ({ error, status, message }) => {
  console.error('[lumina] Unhandled client error:', error);

  return {
    message: message || 'Something went wrong',
    code: String(status || 500),
  };
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[lumina] Global error:', event.error || event.message);
    // Prevent the error from bubbling up and triggering the browser's error UI
    event.preventDefault();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[lumina] Unhandled rejection:', event.reason);
    // Prevent unhandled promise rejections from propagating
    event.preventDefault();
  });
}
