-- Emergency schema fix if prisma migrate deploy is still blocked.
-- Run: psql -d wishlist_db -f scripts/fix-production-db.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3);

ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "isReleased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3);
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Gift_stripeSessionId_idx" ON "Gift"("stripeSessionId");

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Withdrawal + payout tables (admin panel needs these)
CREATE TABLE IF NOT EXISTS "PayoutDetails" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "payoutMethod" TEXT NOT NULL DEFAULT 'bank',
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "routingCode" TEXT,
    "bankName" TEXT,
    "cryptoCurrency" TEXT,
    "cryptoAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayoutDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutDetails_profileId_key" ON "PayoutDetails"("profileId");

CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PayoutDetails" DROP CONSTRAINT IF EXISTS "PayoutDetails_profileId_fkey";
ALTER TABLE "PayoutDetails" ADD CONSTRAINT "PayoutDetails_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS "Withdrawal_creatorId_fkey";
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Withdrawal_creatorId_idx" ON "Withdrawal"("creatorId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX IF NOT EXISTS "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");
