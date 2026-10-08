-- AlterTable
ALTER TABLE "Gig" ADD COLUMN     "setlistCreatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_setlistCreatorId_fkey" FOREIGN KEY ("setlistCreatorId") REFERENCES "Musician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
