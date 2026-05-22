import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = ({ error, status, message }) => {
  console.error('[lumina] Server error:', error);

  return {
    message: message || 'Internal server error',
    code: String(status || 500),
  };
};
