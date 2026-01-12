/**
 * Email Service
 * Handles sending OTP and notifications via email
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  /**
   * Send OTP email
   */
  async sendOTPEmail(email: string, otp: string): Promise<void> {
    // TODO: Integrate with actual email service (SendGrid, Nodemailer, etc.)
    console.log(`📧 OTP Email sent to ${email}: ${otp}`);

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Digital House - Your OTP',
      html: this.getOTPEmailTemplate(otp),
    };

    // await this.sendEmail(emailOptions);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    console.log(`📧 Welcome email sent to ${email}`);

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Welcome to Digital House!',
      html: this.getWelcomeEmailTemplate(name),
    };

    // await this.sendEmail(emailOptions);
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    body: string
  ): Promise<void> {
    const emailOptions: EmailOptions = {
      to: email,
      subject,
      html: this.getNotificationTemplate(body),
    };

    // await this.sendEmail(emailOptions);
  }

  private getOTPEmailTemplate(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Your Digital House OTP</h2>
        <p>Use this One-Time Password to login:</p>
        <h1 style="color: #007bff; letter-spacing: 2px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `;
  }

  private getWelcomeEmailTemplate(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Digital House, ${name}!</h2>
        <p>We're excited to have you join our community.</p>
        <p>Digital House is a platform exclusively for members of our community to reconnect and share.</p>
        <a href="https://digitalhouse.app" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none;">Get Started</a>
      </div>
    `;
  }

  private getNotificationTemplate(body: string): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Notification from Digital House</h2>
        <p>${body}</p>
      </div>
    `;
  }

  // Placeholder for actual email sending
  private async sendEmail(options: EmailOptions): Promise<void> {
    // TODO: Implement with actual email provider
  }
}

export const emailService = new EmailService();
