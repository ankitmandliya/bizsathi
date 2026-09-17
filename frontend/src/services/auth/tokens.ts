const accessTokenKey = 'bizsathi.accessToken';
const refreshTokenKey = 'bizsathi.refreshToken';

export function getAccessToken() {
  return window.localStorage.getItem(accessTokenKey);
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(accessTokenKey, accessToken);
  window.localStorage.setItem(refreshTokenKey, refreshToken);
}

export function clearAuthTokens() {
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
}
