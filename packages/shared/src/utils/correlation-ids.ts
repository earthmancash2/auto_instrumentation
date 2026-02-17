/**
 * Correlation ID utilities for request tracing
 * Used to link events across SSR, client hydration, and backend services
 */

import crypto from 'crypto';

/**
 * Generate a unique request ID (UUID v4)
 * Each API request gets a unique ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a deterministic search ID
 * Same query + filters = same ID (for deduplication)
 */
export function generateSearchId(query: string, filters?: Record<string, any>): string {
  const payload = JSON.stringify({
    query: query.toLowerCase().trim(),
    filters: filters || {},
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Extract client type from user agent and headers
 */
export function detectClientType(headers: Record<string, string | string[] | undefined>): string {
  const clientType = headers['x-client-type'];
  if (typeof clientType === 'string') {
    return clientType;
  }

  const userAgent = headers['user-agent'] || '';
  if (typeof userAgent === 'string') {
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'ios';
    if (userAgent.includes('Android')) return 'android';
  }

  return 'web-ssr';
}

/**
 * Check if request is a prefetch
 */
export function isPrefetchRequest(headers: Record<string, string | string[] | undefined>): boolean {
  const prefetch = headers['x-prefetch'];
  return prefetch === 'true' || prefetch === '1';
}

/**
 * Get retry count from headers
 */
export function getRetryCount(headers: Record<string, string | string[] | undefined>): number {
  const retryCount = headers['x-retry-count'];
  if (typeof retryCount === 'string') {
    return parseInt(retryCount, 10) || 0;
  }
  return 0;
}
