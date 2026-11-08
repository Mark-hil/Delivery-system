import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly smsUrl: string;
  private readonly isSandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("ARKESEL_API_KEY") ?? "";
    this.senderId = this.config.get<string>("ARKESEL_SENDER_ID") ?? "";
    this.smsUrl = this.config.get<string>("ARKESEL_SMS_URL") ?? "";
    this.isSandbox =
      this.config.get<string>("ARKESEL_SANDBOX") === "true" || !this.apiKey;
  }

  /**
   * Normalizes phone numbers to Arkesel's expected Ghana format: 233XXXXXXXXX
   * Handles 024XXXXXXX, +23324XXXXXXX, 23324XXXXXXX.
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return "";
    let cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");

    // Strip leading '+'
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.substring(1);
    }

    // Convert local Ghana prefix (024, 054, 055, 059, 020, 050, 027, 057, etc.)
    if (cleaned.startsWith("0") && cleaned.length === 10) {
      cleaned = "233" + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Core dispatcher to send single or multiple SMS via Arkesel SMS API v2
   */
  async sendSms(to: string | string[], message: string): Promise<SendSmsResult[]> {
    const rawRecipients = Array.isArray(to) ? to : [to];
    const recipients = rawRecipients
      .map((p) => this.normalizePhoneNumber(p))
      .filter((p) => p.length >= 9);

    if (recipients.length === 0) {
      this.logger.warn(`No valid recipients provided for SMS: "${message}"`);
      return rawRecipients.map((r) => ({
        success: false,
        recipient: r,
        error: "Invalid phone number format",
      }));
    }

    // In sandbox or test mode, simulate sending
    if (this.isSandbox) {
      this.logger.log(
        `[ARKESEL SMS SIMULATOR] Sender: "${this.senderId}" | To: [${recipients.join(
          ", ",
        )}] | Message: "${message}"`,
      );
      return recipients.map((recipient) => ({
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        recipient,
      }));
    }

    try {
      const response = await fetch(this.smsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          sender: this.senderId,
          message,
          recipients,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.status === "error")) {
        const errMsg = data?.message || `HTTP ${response.status} ${response.statusText}`;
        this.logger.error(`Arkesel SMS delivery failed: ${errMsg}`, data);
        return recipients.map((r) => ({
          success: false,
          recipient: r,
          error: errMsg,
        }));
      }

      this.logger.log(
        `[ARKESEL SMS DISPATCHED] Recipients: ${recipients.length} | Status: Success`,
      );
      return recipients.map((r) => ({
        success: true,
        messageId: data?.data?.id || `ark_${Date.now()}`,
        recipient: r,
      }));
    } catch (err: any) {
      this.logger.error(`Error connecting to Arkesel SMS API: ${err.message}`, err.stack);
      return recipients.map((r) => ({
        success: false,
        recipient: r,
        error: err.message,
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Specialized SwiftSend SMS Notification Workflows
  // ---------------------------------------------------------------------------

  /**
   * Dispatches 4-digit Auth / Reset Password OTP
   */
  async sendOtp(phone: string, code: string, purpose = "verification"): Promise<boolean> {
    const message = `Your SwiftSend ${purpose} code is: ${code}. Valid for 5 minutes. Do NOT share this code with anyone.`;
    const results = await this.sendSms(phone, message);
    return results[0]?.success ?? false;
  }

  /**
   * Sends incoming parcel notification & Delivery Verification OTP to the parcel receiver
   */
  async sendDeliveryReceiverAlert(
    receiverPhone: string,
    senderName: string,
    deliveryOtp: string,
    trackingCode?: string,
  ): Promise<boolean> {
    const codeSnippet = trackingCode ? ` (Ref: #${trackingCode.substring(0, 8)})` : "";
    const message = `Hello! A package from ${senderName} is on the way to you via SwiftSend${codeSnippet}. Your delivery confirmation OTP is ${deliveryOtp}. Please share this code with the rider upon arrival.`;
    const results = await this.sendSms(receiverPhone, message);
    return results[0]?.success ?? false;
  }

  /**
   * Sends rider assignment alert to sender
   */
  async sendRiderAssignedAlert(
    senderPhone: string,
    riderName: string,
    riderPhone: string,
    trackingCode: string,
  ): Promise<boolean> {
    const message = `SwiftSend Update: Rider ${riderName} (${riderPhone}) has accepted your delivery #${trackingCode.substring(0, 8)}. Track live in your app.`;
    const results = await this.sendSms(senderPhone, message);
    return results[0]?.success ?? false;
  }

  /**
   * Sends package picked up notification to receiver
   */
  async sendPackagePickedUpAlert(
    receiverPhone: string,
    riderName: string,
  ): Promise<boolean> {
    const message = `SwiftSend: Rider ${riderName} has picked up your package and is on the way to your delivery location.`;
    const results = await this.sendSms(receiverPhone, message);
    return results[0]?.success ?? false;
  }

  /**
   * Sends delivery completion confirmation to sender and receiver
   */
  async sendDeliveryCompletedAlert(
    phone: string,
    trackingCode: string,
  ): Promise<boolean> {
    const message = `SwiftSend: Delivery #${trackingCode.substring(0, 8)} has been delivered successfully. Thank you for choosing SwiftSend!`;
    const results = await this.sendSms(phone, message);
    return results[0]?.success ?? false;
  }

  /**
   * Sends document expiration warning to riders
   */
  async sendDocumentExpiryWarning(
    riderPhone: string,
    documentKind: string,
    daysRemaining: number,
  ): Promise<boolean> {
    const dayStr = daysRemaining <= 0 ? "has EXPIRED" : `expires in ${daysRemaining} day(s)`;
    const message = `SwiftSend Compliance: Your ${documentKind} ${dayStr}. Please update your document in the rider portal to avoid account suspension.`;
    const results = await this.sendSms(riderPhone, message);
    return results[0]?.success ?? false;
  }
}
