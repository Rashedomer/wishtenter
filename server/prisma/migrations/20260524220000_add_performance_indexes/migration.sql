-- Alter Profile table to add Stripe fields
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- Create PayoutDetails table if not exists
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutDetails_pkey" PRIMARY KEY ("id")
);

-- Create Withdrawal table if not exists
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- Create SystemSettings table if not exists
CREATE TABLE IF NOT EXISTS "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Alter Gift table to add missing fields and drop NOT NULL constraint on supporterId
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "isReleased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3);
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
ALTER TABLE "Gift" ALTER COLUMN "supporterId" DROP NOT NULL;

-- Update foreign key for Goal on Gift to ON DELETE CASCADE
ALTER TABLE "Gift" DROP CONSTRAINT IF EXISTS "Gift_goalId_fkey";
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_stripeAccountId_key" ON "Profile"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutDetails_profileId_key" ON "PayoutDetails"("profileId");

-- AddForeignKey
ALTER TABLE "PayoutDetails" DROP CONSTRAINT IF EXISTS "PayoutDetails_profileId_fkey";
ALTER TABLE "PayoutDetails" ADD CONSTRAINT "PayoutDetails_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS "Withdrawal_creatorId_fkey";
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes to Profile table for better query performance
CREATE INDEX IF NOT EXISTS "Profile_displayName_idx" ON "Profile"("displayName");
CREATE INDEX IF NOT EXISTS "Profile_createdAt_idx" ON "Profile"("createdAt");

-- Add indexes to Goal table for better query performance
CREATE INDEX IF NOT EXISTS "Goal_creatorId_idx" ON "Goal"("creatorId");
CREATE INDEX IF NOT EXISTS "Goal_status_idx" ON "Goal"("status");
CREATE INDEX IF NOT EXISTS "Goal_createdAt_idx" ON "Goal"("createdAt");

-- Add indexes to Gift table for better query performance
CREATE INDEX IF NOT EXISTS "Gift_creatorId_idx" ON "Gift"("creatorId");
CREATE INDEX IF NOT EXISTS "Gift_goalId_idx" ON "Gift"("goalId");
CREATE INDEX IF NOT EXISTS "Gift_supporterId_idx" ON "Gift"("supporterId");
CREATE INDEX IF NOT EXISTS "Gift_status_idx" ON "Gift"("status");
CREATE INDEX IF NOT EXISTS "Gift_isReleased_idx" ON "Gift"("isReleased");
CREATE INDEX IF NOT EXISTS "Gift_createdAt_idx" ON "Gift"("createdAt");
CREATE INDEX IF NOT EXISTS "Gift_stripeSessionId_idx" ON "Gift"("stripeSessionId");

-- Add indexes to Withdrawal table for better query performance
CREATE INDEX IF NOT EXISTS "Withdrawal_creatorId_idx" ON "Withdrawal"("creatorId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX IF NOT EXISTS "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- Add indexes to Favorite table for better query performance
CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId");
CREATE INDEX IF NOT EXISTS "Favorite_creatorId_idx" ON "Favorite"("creatorId");
