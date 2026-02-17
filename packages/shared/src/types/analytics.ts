// Intentionally inconsistent event naming patterns (realistic tech debt)
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

// Product events with inconsistent naming
export interface ProductViewedEvent extends AnalyticsEvent {
  name: 'product_viewed' | 'ProductViewed' | 'product-view'; // Mixed conventions
  properties: {
    productId: string;
    productTitle: string;
    price: number;
    category: string;
  };
}

export interface ProductAddedToCartEvent extends AnalyticsEvent {
  name: 'add_to_cart' | 'AddedToCart' | 'product_added_to_cart';
  properties: {
    productId: string;
    quantity: number;
    price: number;
  };
}

// Checkout events
export interface CheckoutStartedEvent extends AnalyticsEvent {
  name: 'checkout_started' | 'CheckoutInitiated';
  properties: {
    cartTotal: number;
    itemCount: number;
  };
}

export interface OrderCompletedEvent extends AnalyticsEvent {
  name: 'order_completed' | 'purchase' | 'OrderComplete';
  properties: {
    orderId: string;
    total: number;
    currency: string;
    itemCount: number;
  };
}

// Search events
export interface SearchEvent extends AnalyticsEvent {
  name: 'search' | 'search_performed' | 'SearchQuery';
  properties: {
    query: string;
    resultsCount: number;
  };
}

// User events
export interface UserSignedUpEvent extends AnalyticsEvent {
  name: 'user_signed_up' | 'signup' | 'UserRegistered';
  properties: {
    userId: string;
    role: string;
  };
}

export interface UserLoggedInEvent extends AnalyticsEvent {
  name: 'user_logged_in' | 'login' | 'UserLogin';
  properties: {
    userId: string;
  };
}
