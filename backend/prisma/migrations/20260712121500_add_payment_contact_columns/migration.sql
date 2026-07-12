-- Add the contact columns used by the current Prisma model and payment DTO.
ALTER TABLE "Payment"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ALTER COLUMN "amount" TYPE DECIMAL(12,2);
