-- Between add_band_song and this release the running app still wrote only SetlistItem.songId, and
-- created songs without a BandSong, so repeat the backfill for anything added in that window.

-- The existing band gets a BandSong for every master song or song of its own that lacks one.
INSERT INTO "BandSong" ("id", "status", "singer", "keyboardRequired", "isActive", "createdAt", "updatedAt", "bandId", "songId")
SELECT gen_random_uuid(), s."status", s."singer", s."keyboardRequired", s."isActive", now(), now(),
       '01900000-0000-7000-8000-000000000001', s."id"
FROM "Song" s
WHERE s."ownerBandId" IS NULL OR s."ownerBandId" = '01900000-0000-7000-8000-000000000001'
ON CONFLICT ("bandId", "songId") DO NOTHING;

-- Any other band gets one for exactly the songs its setlists use.
INSERT INTO "BandSong" ("id", "status", "singer", "keyboardRequired", "isActive", "createdAt", "updatedAt", "bandId", "songId")
SELECT gen_random_uuid(), s."status", s."singer", s."keyboardRequired", s."isActive", now(), now(), used."bandId", s."id"
FROM (
  SELECT DISTINCT sl."bandId", si."songId"
  FROM "SetlistItem" si
  JOIN "Setlist" sl ON sl."id" = si."setlistId"
  WHERE si."bandSongId" IS NULL
) used
JOIN "Song" s ON s."id" = used."songId"
ON CONFLICT ("bandId", "songId") DO NOTHING;

UPDATE "SetlistItem" si
SET "bandSongId" = bs."id"
FROM "Setlist" sl, "BandSong" bs
WHERE si."bandSongId" IS NULL
  AND sl."id" = si."setlistId" AND bs."bandId" = sl."bandId" AND bs."songId" = si."songId";

-- AlterTable
ALTER TABLE "SetlistItem" ALTER COLUMN "bandSongId" SET NOT NULL;

-- A setlist item must never lose its song entry: replace SET NULL with RESTRICT.
ALTER TABLE "SetlistItem" DROP CONSTRAINT "SetlistItem_bandSongId_fkey";
ALTER TABLE "SetlistItem" ADD CONSTRAINT "SetlistItem_bandSongId_fkey" FOREIGN KEY ("bandSongId") REFERENCES "BandSong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
