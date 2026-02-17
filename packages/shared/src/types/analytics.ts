/**
 * TypeScript types for analytics events
 * Ensures type safety across all instrumentation
 */

import { ClientContext } from '../utils/client-context';

/**
 * Base properties required for all events
 */
export interface BaseEventProperties {
  timestamp: string;           // ISO 8601 format
  event_name: string;          // Event name (e.g., "search_result_clicked")
  schema_version: number;      // Event schema version
}

/**
 * Frontend-specific required properties
 */
export interface FrontendEventProperties extends BaseEventProperties {
  // Request correlation
  request_id: string;
  session_id: string;

  // User identification
  user_id: string | null;
  device_id: string;
  cookie_id: string;

  // Client context
  user_agent: string;
  ip_address: string | null;

  // Page context
  page: string;                     // Current page path
  action: string;                   // Action type (snake_case)

  // Viewport context
  viewport_width: number;
  viewport_height: number;
  screen_width: number;
  screen_height: number;
  device_pixel_ratio: number;
}

/**
 * Backend request cycle event properties
 */
export interface BackendRequestEventProperties extends BaseEventProperties {
  // Request correlation
  request_id: string;
  session_id: string;
  trace_id?: string;

  // User identification
  user_id: string | null;

  // Client context (from headers)
  client_context: ClientContext;

  // Backend context
  service: string;                  // Service name (e.g., "search-service")
  endpoint: string;                 // API endpoint (e.g., "/api/search")
}

/**
 * Backend system event properties (non-request cycle)
 */
export interface BackendSystemEventProperties extends BaseEventProperties {
  // System context
  service: string;                  // Service name
  job_id: string;                   // Job/task identifier
  trigger: 'scheduled' | 'manual' | 'event-driven';
}

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
}

/**
 * Viewport information
 */
export interface ViewportInfo {
  viewport_width: number;
  viewport_height: number;
  screen_width: number;
  screen_height: number;
  device_pixel_ratio: number;
}

/**
 * Get viewport information (client-side only)
 */
export function getViewportInfo(): ViewportInfo {
  if (typeof window === 'undefined') {
    return {
      viewport_width: 0,
      viewport_height: 0,
      screen_width: 0,
      screen_height: 0,
      device_pixel_ratio: 1,
    };
  }

  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    device_pixel_ratio: window.devicePixelRatio || 1,
  };
}
