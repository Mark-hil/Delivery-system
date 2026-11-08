import { describe, it, expect, beforeEach } from "vitest";
import { ConfigService } from "@nestjs/config";
import { SmsService } from "./sms.service.js";

describe("SmsService (Arkesel SMS Gateway)", () => {
  let service: SmsService;
  let mockConfig: Record<string, string>;

  beforeEach(() => {
    mockConfig = {
      ARKESEL_API_KEY: "arkesel_test_key",
      ARKESEL_SENDER_ID: "SwiftSend",
      ARKESEL_SMS_URL: "https://sms.arkesel.com/api/v2/sms/send",
      ARKESEL_SANDBOX: "true",
    };

    const configService = {
      get: (key: string, defaultVal: string) => mockConfig[key] ?? defaultVal,
    } as unknown as ConfigService;

    service = new SmsService(configService);
  });

  describe("Phone Number Normalization", () => {
    it("should convert local Ghana 10-digit number to 233 format", () => {
      expect(service.normalizePhoneNumber("0244123456")).toBe("233244123456");
      expect(service.normalizePhoneNumber("0551234567")).toBe("233551234567");
      expect(service.normalizePhoneNumber("0209876543")).toBe("233209876543");
    });

    it("should strip leading '+' and spaces/dashes", () => {
      expect(service.normalizePhoneNumber("+233 24 412 3456")).toBe("233244123456");
      expect(service.normalizePhoneNumber("+233-55-123-4567")).toBe("233551234567");
    });

    it("should keep already formatted 233 numbers intact", () => {
      expect(service.normalizePhoneNumber("233244123456")).toBe("233244123456");
    });
  });

  describe("SMS Dispatching in Sandbox Mode", () => {
    it("should simulate sendOtp and return true", async () => {
      const result = await service.sendOtp("0244123456", "1234", "login");
      expect(result).toBe(true);
    });

    it("should simulate sendDeliveryReceiverAlert and return true", async () => {
      const result = await service.sendDeliveryReceiverAlert(
        "0244123456",
        "Ama Owusu",
        "5678",
        "SW-9021"
      );
      expect(result).toBe(true);
    });

    it("should simulate sendRiderAssignedAlert and return true", async () => {
      const result = await service.sendRiderAssignedAlert(
        "0244123456",
        "Kwame Mensah",
        "0201112233",
        "SW-9021"
      );
      expect(result).toBe(true);
    });

    it("should reject invalid phone numbers gracefully", async () => {
      const results = await service.sendSms("12", "Test invalid phone");
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Invalid phone number format");
    });
  });
});
