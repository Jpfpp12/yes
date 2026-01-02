import twilio from 'twilio';
import nodemailer from 'nodemailer';

interface OTPConfig {
  // Twilio SMS Configuration
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  
  // Email Configuration
  emailHost?: string;
  emailPort?: number;
  emailUser?: string;
  emailPassword?: string;
  emailFromAddress?: string;
  emailFromName?: string;
}

interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class OTPService {
  private twilioClient: twilio.Twilio | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;
  private config: OTPConfig;

  constructor(config: OTPConfig = {}) {
    this.config = {
      // Default development configuration
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
      emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
      emailPort: parseInt(process.env.EMAIL_PORT || '587'),
      emailUser: process.env.EMAIL_USER,
      emailPassword: process.env.EMAIL_PASSWORD,
      emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@printquote.com',
      emailFromName: process.env.EMAIL_FROM_NAME || 'PrintQuote',
      ...config,
    };

    this.initializeServices();
  }

  private initializeServices() {
    // Initialize Twilio if credentials are available
    if (this.config.twilioAccountSid && this.config.twilioAuthToken) {
      try {
        this.twilioClient = twilio(this.config.twilioAccountSid, this.config.twilioAuthToken);
        console.log('✅ Twilio SMS service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error);
      }
    } else {
      console.log('⚠️  Twilio credentials not found. SMS sending will be simulated.');
    }

    // Initialize Email if credentials are available
    if (this.config.emailUser && this.config.emailPassword) {
      try {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.emailHost,
          port: this.config.emailPort,
          secure: this.config.emailPort === 465, // true for 465, false for other ports
          auth: {
            user: this.config.emailUser,
            pass: this.config.emailPassword,
          },
        });
        console.log('✅ Email service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize email service:', error);
      }
    } else {
      console.log('⚠️  Email credentials not found. Email sending will be simulated.');
    }
  }

  async sendSMS(mobile: string, otp: string, purpose: string = 'verification'): Promise<SendOTPResult> {
    // Ensure mobile number has country code
    const formattedMobile = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
    
    const message = `Your PrintQuote ${purpose} OTP is: ${otp}. Valid for 2 minutes. Do not share this code with anyone.`;

    if (this.twilioClient && this.config.twilioPhoneNumber) {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.config.twilioPhoneNumber,
          to: formattedMobile,
        });

        console.log(`✅ SMS sent successfully to ${formattedMobile}. Message SID: ${result.sid}`);
        return {
          success: true,
          messageId: result.sid,
        };
      } catch (error: any) {
        console.error(`❌ Failed to send SMS to ${formattedMobile}:`, error.message);
        return {
          success: false,
          error: error.message || 'Failed to send SMS',
        };
      }
    } else {
      // Simulation mode for development
      console.log(`📱 [SIMULATION] SMS to ${formattedMobile}: ${message}`);
      console.log(`🔢 OTP for ${formattedMobile}: ${otp}`);
      
      return {
        success: true,
        messageId: 'simulation_' + Date.now(),
      };
    }
  }

  async sendEmail(email: string, otp: string, purpose: string = 'verification'): Promise<SendOTPResult> {
    const subject = `PrintQuote ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #2563eb; color: white; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">3D</div>
              <h1 style="color: #2563eb; margin: 0;">PrintQuote</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin-bottom: 20px;">Your ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #e2e8f0; margin: 20px 0;">
                <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: monospace;">${otp}</div>
              </div>
              <p style="color: #64748b; margin: 0;">This code will expire in <strong>2 minutes</strong></p>
            </div>
            
            <div style="background: #fef3cd; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Security Note:</strong> Never share this code with anyone. PrintQuote will never ask for your OTP via phone or email.
              </p>
            </div>
            
            <div style="text-align: center; color: #64748b; font-size: 14px;">
              <p>If you didn't request this code, please ignore this email.</p>
              <p>© 2024 PrintQuote. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      PrintQuote ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code
      
      Your verification code is: ${otp}
      
      This code will expire in 2 minutes.
      
      Security Note: Never share this code with anyone. PrintQuote will never ask for your OTP via phone or email.
      
      If you didn't request this code, please ignore this email.
      
      © 2024 PrintQuote. All rights reserved.
    `;

    if (this.emailTransporter) {
      try {
        const result = await this.emailTransporter.sendMail({
          from: `"${this.config.emailFromName}" <${this.config.emailFromAddress}>`,
          to: email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log(`✅ Email sent successfully to ${email}. Message ID: ${result.messageId}`);
        return {
          success: true,
          messageId: result.messageId,
        };
      } catch (error: any) {
        console.error(`❌ Failed to send email to ${email}:`, error.message);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }
    } else {
      // Simulation mode for development
      console.log(`📧 [SIMULATION] Email to ${email}:`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`🔢 OTP for ${email}: ${otp}`);
      console.log(`📧 Content: Your verification code is ${otp}`);
      
      return {
        success: true,
        messageId: 'simulation_' + Date.now(),
      };
    }
  }

  async sendOTP(identifier: string, otp: string, purpose: string = 'verification'): Promise<SendOTPResult> {
    // Determine if identifier is email or mobile
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      return await this.sendEmail(identifier, otp, purpose);
    } else {
      return await this.sendSMS(identifier, otp, purpose);
    }
  }

  // Test connectivity
  async testServices(): Promise<{ sms: boolean; email: boolean }> {
    const results = { sms: false, email: false };

    // Test SMS
    if (this.twilioClient) {
      try {
        await this.twilioClient.api.v2010.accounts(this.config.twilioAccountSid!).fetch();
        results.sms = true;
        console.log('✅ Twilio SMS service connection test passed');
      } catch (error) {
        console.error('❌ Twilio SMS service connection test failed:', error);
      }
    }

    // Test Email
    if (this.emailTransporter) {
      try {
        await this.emailTransporter.verify();
        results.email = true;
        console.log('✅ Email service connection test passed');
      } catch (error) {
        console.error('❌ Email service connection test failed:', error);
      }
    }

    return results;
  }
}

// Create and export singleton instance
export const otpService = new OTPService();

// Export class for custom configurations
export { OTPService };
