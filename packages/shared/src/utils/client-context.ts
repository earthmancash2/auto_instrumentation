/**
 * Client context utilities for extracting client information from HTTP requests
 * Used across all backend services for consistent context capture
 */

export interface ClientContext {
  device_id: string;
  cookie_id: string;
  user_agent: string;
  ip_address: string;
}

/**
 * Extract client context from Express request headers
 * Clients should send these headers on every request
 */
export function extractClientContext(req: any): ClientContext {
  return {
    device_id: (req.headers['x-device-id'] as string) || '',
    cookie_id: (req.headers['x-cookie-id'] as string) || req.cookies?.cookie_id || '',
    user_agent: (req.headers['user-agent'] as string) || '',
    ip_address: getClientIP(req),
  };
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIP(req: any): string {
  // Check common proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return typeof realIP === 'string' ? realIP : realIP[0];
  }

  // Fallback to direct connection IP
  return req.ip || req.connection?.remoteAddress || '';
}

/**
 * Extract correlation IDs from request headers
 */
export function extractCorrelationIds(req: any) {
  return {
    request_id: (req.headers['x-request-id'] as string) || '',
    session_id: (req.headers['x-session-id'] as string) || '',
    trace_id: (req.headers['x-trace-id'] as string) || '',
  };
}
