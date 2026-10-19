-- AlterTable
ALTER TABLE "Song" ADD COLUMN "lyricsUpdatedAt" TIMESTAMP(3),
ADD COLUMN "ownerBandId" UUID;

-- AlterTable
ALTER TABLE "SetlistItem" ADD COLUMN "bandSongId" UUID;

-- CreateTable
CREATE TABLE "BandSong" (
    "id" UUID NOT NULL,
    "status" "SongStatus" NOT NULL DEFAULT 'WISH',
    "singer" TEXT,
    "keyboardRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bandId" UUID NOT NULL,
    "songId" TEXT NOT NULL,

    CONSTRAINT "BandSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BandSong_songId_idx" ON "BandSong"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "BandSong_bandId_songId_key" ON "BandSong"("bandId", "songId");

-- CreateIndex
CREATE INDEX "Song_ownerBandId_idx" ON "Song"("ownerBandId");

-- CreateIndex
CREATE INDEX "SetlistItem_bandSongId_idx" ON "SetlistItem"("bandSongId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_ownerBandId_fkey" FOREIGN KEY ("ownerBandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandSong" ADD CONSTRAINT "BandSong_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandSong" ADD CONSTRAINT "BandSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistItem" ADD CONSTRAINT "SetlistItem_bandSongId_fkey" FOREIGN KEY ("bandSongId") REFERENCES "BandSong"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill. Every existing Song stays ownerBandId = NULL, i.e. the master catalog, so The Ruminators'
-- songs are shared with any band that joins (a deliberate choice, see docs/multi-band-design.md).
UPDATE "Song" SET "lyricsUpdatedAt" = COALESCE("lyricsImportedAt", "updatedAt") WHERE "lyrics" IS NOT NULL;

-- The existing band (created by add_band_tenancy) has every song in its catalog, carrying over the
-- band-specific fields that still live on Song until the contract migration (#136).
INSERT INTO "BandSong" ("id", "status", "singer", "keyboardRequired", "isActive", "createdAt", "updatedAt", "bandId", "songId")
SELECT gen_random_uuid(), s."status", s."singer", s."keyboardRequired", s."isActive", now(), now(),
       '01900000-0000-7000-8000-000000000001', s."id"
FROM "Song" s;

-- Any other band that already has setlist items (only the dev seed's second band) gets a BandSong for
-- exactly the songs it uses, so no item ends up pointing at another band's catalog entry.
INSERT INTO "BandSong" ("id", "status", "singer", "keyboardRequired", "isActive", "createdAt", "updatedAt", "bandId", "songId")
SELECT gen_random_uuid(), s."status", s."singer", s."keyboardRequired", s."isActive", now(), now(), used."bandId", s."id"
FROM (
  SELECT DISTINCT sl."bandId", si."songId"
  FROM "SetlistItem" si
  JOIN "Setlist" sl ON sl."id" = si."setlistId"
) used
JOIN "Song" s ON s."id" = used."songId"
ON CONFLICT ("bandId", "songId") DO NOTHING;

UPDATE "SetlistItem" si
SET "bandSongId" = bs."id"
FROM "Setlist" sl, "BandSong" bs
WHERE sl."id" = si."setlistId" AND bs."bandId" = sl."bandId" AND bs."songId" = si."songId";
