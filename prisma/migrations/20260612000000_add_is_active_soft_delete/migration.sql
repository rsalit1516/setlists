-- AlterTable: add isActive soft-delete flag to all tables
ALTER TABLE "Song"        ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Venue"       ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Setlist"     ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SetlistItem" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Gig"         ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Expense"     ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GigMusician" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
