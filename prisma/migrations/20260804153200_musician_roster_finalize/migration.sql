-- DropForeignKey
ALTER TABLE "GigMusician" DROP CONSTRAINT "GigMusician_musicianId_fkey";

-- AlterTable
ALTER TABLE "GigMusician" DROP COLUMN "amountPaid",
DROP COLUMN "name",
DROP COLUMN "paidAt",
ALTER COLUMN "musicianId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GigMusician_gigId_musicianId_key" ON "GigMusician"("gigId", "musicianId");

-- AddForeignKey
ALTER TABLE "GigMusician" ADD CONSTRAINT "GigMusician_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "Musician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
