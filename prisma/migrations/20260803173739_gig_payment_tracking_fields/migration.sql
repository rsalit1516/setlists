/*
  Warnings:

  - You are about to drop the column `share` on the `GigMusician` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "otherRevenue" DECIMAL(65,30),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "tips" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "GigMusician" DROP COLUMN "share",
ADD COLUMN     "amountPaid" DECIMAL(65,30),
ADD COLUMN     "paidAt" TIMESTAMP(3);
