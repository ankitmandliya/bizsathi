import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from '../utils/error';

describe('getErrorMessage utility', () => {
  it('returns response.data.detail when present on Axios error', () => {
    const errorResponse = {
      config: { headers: new AxiosHeaders() },
      data: { detail: 'Lead name is required' },
      headers: new AxiosHeaders(),
      status: 400,
      statusText: 'Bad Request',
    };
    const axiosError = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      errorResponse,
    );

    const message = getErrorMessage(axiosError, 'Fallback message');
    expect(message).toBe('Lead name is required');
  });

  it('returns fallback message on a plain network error without response', () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
    const message = getErrorMessage(networkError, 'Unable to connect to server');
    expect(message).toBe('Network Error');
  });

  it('returns default fallback when error is completely unknown', () => {
    const unknownErr = null;
    const message = getErrorMessage(unknownErr, 'Fallback error message');
    expect(message).toBe('Fallback error message');
  });
});
