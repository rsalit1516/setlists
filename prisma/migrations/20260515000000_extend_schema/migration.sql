-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('READY', 'IN_PROGRESS', 'WISH');

-- CreateEnum
CREATE TYPE "SetSection" AS ENUM ('SOUNDCHECK', 'MAIN', 'ENCORE');

-- AlterTable: Song — add new columns
ALTER TABLE "Song"
  ADD COLUMN "singer"           TEXT,
  ADD COLUMN "status"           "SongStatus" NOT NULL DEFAULT 'WISH',
  ADD COLUMN "keyboardRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "durationSeconds"  INTEGER,
  ADD COLUMN "orientation"      TEXT;

-- AlterTable: Setlist — drop date column
ALTER TABLE "Setlist" DROP COLUMN "date";

-- AlterTable: SetlistItem — add new columns
ALTER TABLE "SetlistItem"
  ADD COLUMN "section"     "SetSection" NOT NULL DEFAULT 'MAIN',
  ADD COLUMN "setNumber"   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "wasPlayed"   BOOLEAN,
  ADD COLUMN "isUnplanned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Venue
CREATE TABLE "Venue" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "address"   TEXT,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Gig
CREATE TABLE "Gig" (
    "id"               TEXT NOT NULL,
    "date"             TIMESTAMP(3) NOT NULL,
    "notes"            TEXT,
    "amountContracted" DECIMAL(65,30),
    "amountPaid"       DECIMAL(65,30),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "venueId"          TEXT NOT NULL,
    "setlistId"        TEXT NOT NULL,

    CONSTRAINT "Gig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id"          TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount"      DECIMAL(65,30) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gigId"       TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GigMusician
CREATE TABLE "GigMusician" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "share"     DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gigId"     TEXT NOT NULL,

    CONSTRAINT "GigMusician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Gig.setlistId must be unique (one setlist per gig)
CREATE UNIQUE INDEX "Gig_setlistId_key" ON "Gig"("setlistId");

-- AddForeignKey: Gig → Venue
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Gig → Setlist
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_setlistId_fkey"
  FOREIGN KEY ("setlistId") REFERENCES "Setlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Expense → Gig
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gigId_fkey"
  FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: GigMusician → Gig
ALTER TABLE "GigMusician" ADD CONSTRAINT "GigMusician_gigId_fkey"
  FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
