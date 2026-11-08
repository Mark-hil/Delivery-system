-- 1. Sync Payment & PaymentWebhookEvent schema changes
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'Abandoned';

ALTER TABLE "Payment"
  ALTER COLUMN "deliveryId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'delivery_fee',
  ADD COLUMN IF NOT EXISTS "paystackAccessCode" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX IF NOT EXISTS "Payment_transactionRef_idx" ON "Payment"("transactionRef");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_customerId_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_reference_key" ON "PaymentWebhookEvent"("reference");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_reference_idx" ON "PaymentWebhookEvent"("reference");

-- 2. Enable and Force PostgreSQL Row-Level Security (RLS) on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" FORCE ROW LEVEL SECURITY;

ALTER TABLE "CustomerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerProfile" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RiderProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderProfile" FORCE ROW LEVEL SECURITY;

ALTER TABLE "AdminProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminProfile" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RiderDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderDocument" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Delivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Delivery" FORCE ROW LEVEL SECURITY;

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WalletTxn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletTxn" FORCE ROW LEVEL SECURITY;

ALTER TABLE "RiderEarning" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiderEarning" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PlatformSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSettings" FORCE ROW LEVEL SECURITY;

-- 3. Row-Level Security Policies (Owner-scoped when app.current_user_id is set; Admin/System allowed)

-- User: Only the owner or an admin can access a User row
DROP POLICY IF EXISTS "user_isolation_policy" ON "User";
CREATE POLICY "user_isolation_policy" ON "User"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "id" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "id" = current_setting('app.current_user_id', true)
  );

-- RefreshToken: Only the token owner or admin
DROP POLICY IF EXISTS "refresh_token_isolation_policy" ON "RefreshToken";
CREATE POLICY "refresh_token_isolation_policy" ON "RefreshToken"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  );

-- CustomerProfile: Only the owning customer or admin
DROP POLICY IF EXISTS "customer_profile_isolation_policy" ON "CustomerProfile";
CREATE POLICY "customer_profile_isolation_policy" ON "CustomerProfile"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  );

-- RiderProfile: Only the owning rider or admin
DROP POLICY IF EXISTS "rider_profile_isolation_policy" ON "RiderProfile";
CREATE POLICY "rider_profile_isolation_policy" ON "RiderProfile"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR "userId" = current_setting('app.current_user_id', true)
  );

-- AdminProfile: Admin only
DROP POLICY IF EXISTS "admin_profile_isolation_policy" ON "AdminProfile";
CREATE POLICY "admin_profile_isolation_policy" ON "AdminProfile"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- RiderDocument: Only the owning rider or admin
DROP POLICY IF EXISTS "rider_document_isolation_policy" ON "RiderDocument";
CREATE POLICY "rider_document_isolation_policy" ON "RiderDocument"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "RiderProfile" rp
      WHERE rp."id" = "RiderDocument"."riderId"
        AND rp."userId" = current_setting('app.current_user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "RiderProfile" rp
      WHERE rp."id" = "RiderDocument"."riderId"
        AND rp."userId" = current_setting('app.current_user_id', true)
    )
  );

-- Delivery: Owning customer, assigned rider (or searching job for riders), or admin
DROP POLICY IF EXISTS "delivery_isolation_policy" ON "Delivery";
CREATE POLICY "delivery_isolation_policy" ON "Delivery"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "CustomerProfile" cp
      WHERE cp."id" = "Delivery"."customerId"
        AND cp."userId" = current_setting('app.current_user_id', true)
    )
    OR (
      current_setting('app.current_user_role', true) = 'rider'
      AND (
        "Delivery"."status" = 'searching'
        OR EXISTS (
          SELECT 1 FROM "RiderProfile" rp
          WHERE rp."id" = "Delivery"."riderId"
            AND rp."userId" = current_setting('app.current_user_id', true)
        )
      )
    )
  );

-- Payment: Owning customer or admin
DROP POLICY IF EXISTS "payment_isolation_policy" ON "Payment";
CREATE POLICY "payment_isolation_policy" ON "Payment"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "CustomerProfile" cp
      WHERE cp."id" = "Payment"."customerId"
        AND cp."userId" = current_setting('app.current_user_id', true)
    )
  );

-- WalletTxn: Owning customer or admin
DROP POLICY IF EXISTS "wallet_txn_isolation_policy" ON "WalletTxn";
CREATE POLICY "wallet_txn_isolation_policy" ON "WalletTxn"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "CustomerProfile" cp
      WHERE cp."id" = "WalletTxn"."customerId"
        AND cp."userId" = current_setting('app.current_user_id', true)
    )
  );

-- RiderEarning: Owning rider or admin
DROP POLICY IF EXISTS "rider_earning_isolation_policy" ON "RiderEarning";
CREATE POLICY "rider_earning_isolation_policy" ON "RiderEarning"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
    OR EXISTS (
      SELECT 1 FROM "RiderProfile" rp
      WHERE rp."id" = "RiderEarning"."riderId"
        AND rp."userId" = current_setting('app.current_user_id', true)
    )
  );

-- PaymentWebhookEvent: Admin / System only
DROP POLICY IF EXISTS "webhook_event_isolation_policy" ON "PaymentWebhookEvent";
CREATE POLICY "webhook_event_isolation_policy" ON "PaymentWebhookEvent"
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- PlatformSettings: Readable by all, writable by Admin/System only
DROP POLICY IF EXISTS "platform_settings_read_policy" ON "PlatformSettings";
CREATE POLICY "platform_settings_read_policy" ON "PlatformSettings"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "platform_settings_write_policy" ON "PlatformSettings";
CREATE POLICY "platform_settings_write_policy" ON "PlatformSettings"
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR current_setting('app.current_user_role', true) = 'admin'
  );

