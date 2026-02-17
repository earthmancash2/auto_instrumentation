/**
 * Fake Intercom integration for customer messaging
 */

export interface IntercomUser {
  userId?: string;
  email?: string;
  name?: string;
  customAttributes?: Record<string, any>;
}

export interface IntercomEvent {
  eventName: string;
  userId: string;
  metadata?: Record<string, any>;
}

export class IntercomStub {
  private appId: string;
  private events: IntercomEvent[] = [];

  constructor(appId: string) {
    this.appId = appId;
  }

  boot(user: IntercomUser): void {
    console.log('[Intercom Stub] Booting with user:', user.email || user.userId);
    // In real app, would initialize Intercom widget
  }

  update(data: Partial<IntercomUser>): void {
    console.log('[Intercom Stub] Updating user data:', data);
  }

  trackEvent(event: IntercomEvent): void {
    console.log('[Intercom Stub] Tracking event:', event.eventName, event.metadata);
    this.events.push(event);
  }

  showMessages(): void {
    console.log('[Intercom Stub] Showing messages');
  }

  hide(): void {
    console.log('[Intercom Stub] Hiding widget');
  }

  shutdown(): void {
    console.log('[Intercom Stub] Shutting down');
  }

  // Get tracked events (for debugging)
  getEvents(): IntercomEvent[] {
    return [...this.events];
  }
}

// Export singleton instance
export const intercom = new IntercomStub(process.env.INTERCOM_APP_ID || 'fake_app_id');

// Client-side script content (loaded in _document.tsx)
export const intercomScript = `
(function() {
  window.Intercom = function() {
    console.log('[Intercom Script] Called:', arguments);
  };
  window.Intercom('boot', {
    app_id: '${process.env.NEXT_PUBLIC_INTERCOM_APP_ID || 'fake_app_id'}',
  });
})();
`;
