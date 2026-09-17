import axios from 'axios';

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.detail) {
      const detail = err.response.data.detail;
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
