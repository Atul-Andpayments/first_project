-- Align the database with the payment-link model used by the application.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "Payment"
  ADD COLUMN "paymentUrl" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  DROP COLUMN "referenceNumber",
  DROP COLUMN "stripePaymentIntentId",
  DROP COLUMN "currency",
  DROP COLUMN "customerEmail",
  DROP COLUMN "customerPhone";
