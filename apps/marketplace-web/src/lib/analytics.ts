/**
 * Client-side analytics wrapper
 * Demonstrates inconsistent event naming (realistic tech debt)
 */

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, any>;
};

class Analytics {
  private initialized = false;

  init() {
    if (typeof window === 'undefined') return;
    this.initialized = true;
    console.log('[Analytics] Initialized');
  }

  // Different tracking methods (inconsistent API - realistic)
  track(event: AnalyticsEvent) {
    if (!this.initialized) this.init();
    console.log('[Analytics] track:', event.name, event.properties);
    // In production, would send to analytics service
  }

  trackEvent(name: string, properties?: Record<string, any>) {
    if (!this.initialized) this.init();
    console.log('[Analytics] trackEvent (legacy):', name, properties);
  }

  logEvent(name: string, params?: Record<string, any>) {
    if (!this.initialized) this.init();
    console.log('[Analytics] logEvent:', name, params);
  }

  pageView(path: string) {
    if (!this.initialized) this.init();
    console.log('[Analytics] pageView:', path);
  }
}

export const analytics = new Analytics();

// Convenience functions with inconsistent naming
export const trackProductView = (productId: string, title: string, price: number) => {
  analytics.track({ name: 'product_viewed', properties: { productId, title, price } });
};

export const trackAddToCart = (productId: string, quantity: number) => {
  analytics.trackEvent('AddedToCart', { productId, quantity });
};

export const trackCheckout = (total: number) => {
  analytics.logEvent('checkout_started', { total });
};

export const trackPurchase = (orderId: string, total: number) => {
  analytics.track({ name: 'purchase', properties: { orderId, total } });
};
