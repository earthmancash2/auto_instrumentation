/**
 * Fake Stripe integration for testing
 * Simulates Stripe API with 5% random payment failures
 */

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  clientSecret: string;
  created: number;
}

export interface StripePaymentMethod {
  type: 'card' | 'bank_transfer';
  card?: {
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  paymentMethod: StripePaymentMethod;
  customerId?: string;
  metadata?: Record<string, string>;
}

export class StripeStub {
  private apiKey: string;
  private failureRate = 0.05; // 5% failure rate

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<StripePaymentIntent> {
    console.log('[Stripe Stub] Creating payment intent:', {
      amount: params.amount,
      currency: params.currency,
    });

    // Simulate API delay
    await this.delay(100 + Math.random() * 200);

    // Randomly fail 5% of payments
    const shouldFail = Math.random() < this.failureRate;

    const paymentIntent: StripePaymentIntent = {
      id: `pi_${this.generateId()}`,
      amount: params.amount,
      currency: params.currency,
      status: shouldFail ? 'failed' : 'succeeded',
      clientSecret: `pi_${this.generateId()}_secret_${this.generateId()}`,
      created: Date.now(),
    };

    if (shouldFail) {
      console.error('[Stripe Stub] Payment failed (simulated):', paymentIntent.id);
    } else {
      console.log('[Stripe Stub] Payment succeeded:', paymentIntent.id);
    }

    return paymentIntent;
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
    console.log('[Stripe Stub] Retrieving payment intent:', paymentIntentId);

    await this.delay(50 + Math.random() * 100);

    // Mock response
    return {
      id: paymentIntentId,
      amount: 5000,
      currency: 'usd',
      status: 'succeeded',
      clientSecret: `${paymentIntentId}_secret_${this.generateId()}`,
      created: Date.now() - 60000,
    };
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<{ id: string; status: string }> {
    console.log('[Stripe Stub] Refunding payment:', paymentIntentId, amount);

    await this.delay(150 + Math.random() * 250);

    return {
      id: `re_${this.generateId()}`,
      status: 'succeeded',
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const stripe = new StripeStub(process.env.STRIPE_API_KEY || 'sk_test_fake');
