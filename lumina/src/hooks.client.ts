import type { HandleClientError } from '@sveltejs/kit';

/**
 * SvelteKit client-side error handler.
 * Returning a custom error object prevents the default behavior and
 * allows the app to gracefully degrade instead of showing the error page.
 */
export const handleError: HandleClientError = ({ error, status, message }) => {
  const msg = error instanceof Error ? error.message : (message || 'Something went wrong');
  const stack = error instanceof Error ? error.stack : '';
  const detail = `[Lumina Error - ${status || 500}]\n${msg}\n\n${stack || '(no stack)'}`;
  alert(detail);
  console.error('[lumina] Unhandled client error:', error);
  return { message: msg, detail: stack, code: String(status || 500) };
};

/** Called once when the client-side app starts. */
export function init(): void {}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = `[Lumina Global Error]\n${event.error?.stack || event.error?.message || event.message || '(unknown)'}`;
    alert(msg);
    console.error('[lumina] Global error:', event.error || event.message);
    event.preventDefault();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = `[Lumina Unhandled Rejection]\n${event.reason?.stack || event.reason?.message || event.reason || '(unknown)'}`;
    alert(msg);
    console.error('[lumina] Unhandled rejection:', event.reason);
    event.preventDefault();
  });
}
