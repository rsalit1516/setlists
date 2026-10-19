-- Converts the tenant tables from text (cuid) keys to native uuid, per the UUIDv7 convention in
-- CLAUDE.md. add_band_tenancy created them as text; it has already been applied, so it is left alone.
-- Existing ids are rewritten first (children included), then the column types are changed.

-- DropForeignKey
ALTER TABLE "BandMember" DROP CONSTRAINT "BandMember_userId_fkey";
ALTER TABLE "BandMember" DROP CONSTRAINT "BandMember_bandId_fkey";
ALTER TABLE "Venue" DROP CONSTRAINT "Venue_bandId_fkey";
ALTER TABLE "Musician" DROP CONSTRAINT "Musician_bandId_fkey";
ALTER TABLE "Setlist" DROP CONSTRAINT "Setlist_bandId_fkey";
ALTER TABLE "Gig" DROP CONSTRAINT "Gig_bandId_fkey";

-- Old id -> new id. The two well-known bands get the fixed ids that lib/band.ts and the dev seed use;
-- anything already shaped like a UUID is kept; the rest get a fresh one.
CREATE TEMP TABLE "_band_id_map" AS
SELECT "id" AS "old_id",
  CASE
    WHEN "id" = 'band-the-ruminators' THEN '01900000-0000-7000-8000-000000000001'
    WHEN "id" = 'seed-band-2' THEN '01900000-0000-7000-8000-0000000000a2'
    WHEN "id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "id"
    ELSE gen_random_uuid()::text
  END AS "new_id"
FROM "Band";

CREATE TEMP TABLE "_user_id_map" AS
SELECT "id" AS "old_id",
  CASE
    WHEN "id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "id"
    ELSE gen_random_uuid()::text
  END AS "new_id"
FROM "User";

-- Children first, then the parents' own ids
UPDATE "Venue" t SET "bandId" = m."new_id" FROM "_band_id_map" m WHERE t."bandId" = m."old_id";
UPDATE "Musician" t SET "bandId" = m."new_id" FROM "_band_id_map" m WHERE t."bandId" = m."old_id";
UPDATE "Setlist" t SET "bandId" = m."new_id" FROM "_band_id_map" m WHERE t."bandId" = m."old_id";
UPDATE "Gig" t SET "bandId" = m."new_id" FROM "_band_id_map" m WHERE t."bandId" = m."old_id";
UPDATE "BandMember" t SET "bandId" = m."new_id" FROM "_band_id_map" m WHERE t."bandId" = m."old_id";
UPDATE "BandMember" t SET "userId" = m."new_id" FROM "_user_id_map" m WHERE t."userId" = m."old_id";
UPDATE "BandMember" SET "id" = gen_random_uuid()::text
WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE "Band" t SET "id" = m."new_id" FROM "_band_id_map" m WHERE t."id" = m."old_id";
UPDATE "User" t SET "id" = m."new_id" FROM "_user_id_map" m WHERE t."id" = m."old_id";

DROP TABLE "_band_id_map";
DROP TABLE "_user_id_map";

-- AlterTable
ALTER TABLE "Band" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "User" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "BandMember" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "BandMember" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;
ALTER TABLE "BandMember" ALTER COLUMN "bandId" TYPE UUID USING "bandId"::uuid;
ALTER TABLE "Venue" ALTER COLUMN "bandId" TYPE UUID USING "bandId"::uuid;
ALTER TABLE "Musician" ALTER COLUMN "bandId" TYPE UUID USING "bandId"::uuid;
ALTER TABLE "Setlist" ALTER COLUMN "bandId" TYPE UUID USING "bandId"::uuid;
ALTER TABLE "Gig" ALTER COLUMN "bandId" TYPE UUID USING "bandId"::uuid;

-- AddForeignKey
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BandMember" ADD CONSTRAINT "BandMember_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Musician" ADD CONSTRAINT "Musician_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Setlist" ADD CONSTRAINT "Setlist_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
