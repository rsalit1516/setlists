-- CreateEnum
CREATE TYPE "LyricsSource" AS ENUM ('MANUAL', 'IMPORTED');

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "lyricsImportedAt" TIMESTAMP(3),
ADD COLUMN     "lyricsSource" "LyricsSource",
ADD COLUMN     "lyricsSourceUrl" TEXT;

-- Existing lyrics were all typed in by the band.
UPDATE "Song" SET "lyricsSource" = 'MANUAL' WHERE "lyrics" IS NOT NULL;
