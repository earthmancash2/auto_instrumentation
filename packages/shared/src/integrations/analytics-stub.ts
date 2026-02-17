/**
 * Fake Analytics integration (simulates Google Analytics)
 * Demonstrates inconsistent event naming patterns (realistic tech debt)
 */

import { AnalyticsEvent } from '../types/analytics';

export class AnalyticsStub {
  private trackingId: string;
  private events: AnalyticsEvent[] = [];

  constructor(trackingId: string) {
    this.trackingId = trackingId;
  }

  // Different methods with inconsistent naming (realistic)
  track(event: AnalyticsEvent): void {
    console.log('[Analytics] track:', event.name, event.properties);
    this.events.push({
      ...event,
      timestamp: event.timestamp || new Date(),
    });
  }

  // Legacy method (still used in some places)
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    console.log('[Analytics] trackEvent (legacy):', eventName, properties);
    this.events.push({
      name: eventName,
      properties,
      timestamp: new Date(),
    });
  }

  // Another legacy method with different naming
  logEvent(name: string, params?: Record<string, any>): void {
    console.log('[Analytics] logEvent:', name, params);
    this.events.push({
      name,
      properties: params,
      timestamp: new Date(),
    });
  }

  // Page view tracking
  pageView(path: string, title?: string): void {
    console.log('[Analytics] pageView:', path, title);
    this.track({
      name: 'page_view', // Inconsistent with other naming
      properties: {
        path,
        title,
      },
    });
  }

  // Identify user (another method signature)
  identify(userId: string, traits?: Record<string, any>): void {
    console.log('[Analytics] identify:', userId, traits);
    // In real app, would set user context
  }

  // Get tracked events (for debugging)
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Clear events
  clearEvents(): void {
    this.events = [];
  }
}

// Export singleton instance
export const analytics = new AnalyticsStub(process.env.ANALYTICS_ID || 'GA-FAKE-12345');

// Export convenience functions with different naming patterns
export const trackProductView = (productId: string, productTitle: string, price: number) => {
  // Inconsistent event name
  analytics.track({
    name: 'product_viewed',
    properties: { productId, productTitle, price },
  });
};

export const trackAddToCart = (productId: string, quantity: number, price: number) => {
  // Different naming convention
  analytics.trackEvent('AddedToCart', { productId, quantity, price });
};

export const trackCheckout = (cartTotal: number, itemCount: number) => {
  // Yet another convention
  analytics.logEvent('checkout_started', { cartTotal, itemCount });
};

export const trackPurchase = (orderId: string, total: number, currency: string) => {
  // Mixed naming
  analytics.track({
    name: 'purchase', // Different from order_completed
    properties: { orderId, total, currency },
  });
};
