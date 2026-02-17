/**
 * Client ID utilities for generating and retrieving persistent identifiers
 * Used across all frontend applications for consistent user/device tracking
 */

/**
 * Get or create session ID (persists for browser session)
 * Stored in sessionStorage, cleared when browser closes
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

/**
 * Get or create device ID (persists long-term)
 * Stored in localStorage, persists across sessions
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Get or create cookie ID (persists for 1 year)
 * Stored in cookies, accessible by server
 */
export function getCookieId(): string {
  if (typeof window === 'undefined') return '';

  const cookies = document.cookie.split('; ');
  const cookieIdCookie = cookies.find(c => c.startsWith('cookie_id='));

  if (cookieIdCookie) {
    return cookieIdCookie.split('=')[1];
  }

  // Create new cookie_id
  const newCookieId = generateUUID();
  document.cookie = `cookie_id=${newCookieId}; path=/; max-age=31536000; SameSite=Lax`; // 1 year
  return newCookieId;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get all client IDs at once
 */
export function getClientIds() {
  return {
    session_id: getSessionId(),
    device_id: getDeviceId(),
    cookie_id: getCookieId(),
  };
}
