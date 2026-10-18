-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationFee" DECIMAL(65,30);
