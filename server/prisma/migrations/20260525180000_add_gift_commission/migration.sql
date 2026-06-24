-- AlterTable
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill from amount - netAmount for existing rows
UPDATE "Gift" SET "commissionAmount" = GREATEST(0, "amount" - "netAmount") WHERE "commissionAmount" = 0 AND "amount" > "netAmount";
