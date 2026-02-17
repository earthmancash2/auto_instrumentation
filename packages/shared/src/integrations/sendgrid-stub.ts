/**
 * Fake SendGrid integration for email sending
 */

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface EmailResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export class SendGridStub {
  private apiKey: string;
  private sentEmails: EmailData[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(emailData: EmailData): Promise<EmailResponse> {
    console.log('[SendGrid Stub] Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      templateId: emailData.templateId,
    });

    // Simulate API delay
    await this.delay(80 + Math.random() * 120);

    this.sentEmails.push(emailData);

    // Mock successful response
    return {
      statusCode: 202,
      body: '',
      headers: {
        'x-message-id': `msg_${this.generateId()}`,
      },
    };
  }

  async sendOrderConfirmation(email: string, orderId: string, orderTotal: number): Promise<EmailResponse> {
    return this.send({
      to: email,
      from: 'orders@marketplace.com',
      subject: `Order Confirmation #${orderId}`,
      templateId: 'd-order-confirmation',
      dynamicTemplateData: {
        orderId,
        orderTotal,
        orderUrl: `https://marketplace.com/orders/${orderId}`,
      },
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<EmailResponse> {
    return this.send({
      to: email,
      from: 'welcome@marketplace.com',
      subject: 'Welcome to Marketplace!',
      templateId: 'd-welcome',
      dynamicTemplateData: {
        username,
      },
    });
  }

  // Get sent emails (for testing)
  getSentEmails(): EmailData[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const sendgrid = new SendGridStub(process.env.SENDGRID_API_KEY || 'SG.fake_key');
