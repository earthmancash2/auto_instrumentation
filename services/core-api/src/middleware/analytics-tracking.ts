import { Request, Response, NextFunction } from 'express';
import { analytics } from '@marketplace/shared';

/**
 * Manual analytics tracking middleware
 * Demonstrates inconsistent event tracking (realistic tech debt)
 */
export function analyticsTracking(req: Request, res: Response, next: NextFunction) {
  // Track API requests (inconsistent naming)
  const eventName = `api_${req.method.toLowerCase()}_${req.path.replace(/\//g, '_')}`;

  // Sometimes use track, sometimes use trackEvent (inconsistent)
  if (Math.random() > 0.5) {
    analytics.track({
      name: eventName,
      properties: {
        method: req.method,
        path: req.path,
        query: req.query,
      },
    });
  } else {
    analytics.trackEvent(eventName, {
      method: req.method,
      path: req.path,
      query: req.query,
    });
  }

  next();
}

// Helper function for tracking specific events
export function trackEvent(eventName: string, properties?: any) {
  console.log('[Track Event]', eventName, properties); // Mixed logging
  analytics.track({
    name: eventName,
    properties,
  });
}

// Legacy tracking function (different naming)
export function logAnalyticsEvent(name: string, data?: any) {
  analytics.logEvent(name, data);
}
