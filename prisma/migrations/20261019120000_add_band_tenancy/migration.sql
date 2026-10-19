-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "Band" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Band_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandMember" (
    "id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "bandId" UUID NOT NULL,

    CONSTRAINT "BandMember_pkey" PRIMARY KEY ("id")
);

-- The one existing band. Every pre-existing row is assigned to it below via the column default,
-- which is dropped again once the backfill is done. The fixed id lets lib/band.ts and the seed refer to it.
INSERT INTO "Band" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('01900000-0000-7000-8000-000000000001', 'The Ruminators', true, now(), now());

-- AlterTable: add bandId (existing rows backfilled by the default), then drop the default
ALTER TABLE "Venue" ADD COLUMN "bandId" UUID NOT NULL DEFAULT '01900000-0000-7000-8000-000000000001';
ALTER TABLE "Venue" ALTER COLUMN "bandId" DROP DEFAULT;

ALTER TABLE "Musician" ADD COLUMN "bandId" UUID NOT NULL DEFAULT '01900000-0000-7000-8000-000000000001';
ALTER TABLE "Musician" ALTER COLUMN "bandId" DROP DEFAULT;

ALTER TABLE "Setlist" ADD COLUMN "bandId" UUID NOT NULL DEFAULT '01900000-0000-7000-8000-000000000001';
ALTER TABLE "Setlist" ALTER COLUMN "bandId" DROP DEFAULT;

ALTER TABLE "Gig" ADD COLUMN "bandId" UUID NOT NULL DEFAULT '01900000-0000-7000-8000-000000000001';
ALTER TABLE "Gig" ALTER COLUMN "bandId" DROP DEFAULT;

-- DropIndex
DROP INDEX "Musician_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BandMember_bandId_idx" ON "BandMember"("bandId");

-- CreateIndex
CREATE UNIQUE INDEX "BandMember_userId_bandId_key" ON "BandMember"("userId", "bandId");

-- CreateIndex
CREATE INDEX "Venue_bandId_idx" ON "Venue"("bandId");

-- CreateIndex
CREATE UNIQUE INDEX "Musician_bandId_name_key" ON "Musician"("bandId", "name");

-- CreateIndex
CREATE INDEX "Setlist_bandId_idx" ON "Setlist"("bandId");

-- CreateIndex
CREATE INDEX "Gig_bandId_date_idx" ON "Gig"("bandId", "date");

-- AddForeignKey
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Musician" ADD CONSTRAINT "Musician_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setlist" ADD CONSTRAINT "Setlist_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
