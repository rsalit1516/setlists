-- AlterTable
ALTER TABLE "GigMusician" ADD COLUMN     "musicianId" TEXT,
ADD COLUMN     "share" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Musician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Musician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Musician_name_key" ON "Musician"("name");

-- AddForeignKey
ALTER TABLE "GigMusician" ADD CONSTRAINT "GigMusician_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "Musician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one Musician per distinct existing GigMusician.name
INSERT INTO "Musician" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, gm."name", true, now(), now()
FROM (SELECT DISTINCT "name" FROM "GigMusician") gm
ON CONFLICT ("name") DO NOTHING;

-- Point existing GigMusician rows at their Musician
UPDATE "GigMusician" gm
SET "musicianId" = m."id"
FROM "Musician" m
WHERE gm."name" = m."name";

-- Seed canonical default musicians if not already present (idempotent for other envs)
INSERT INTO "Musician" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, true, now(), now()
FROM (VALUES ('Richard Salit'), ('Jeff Zbar'), ('Scott Tunis'), ('Andrew Guerrero')) AS v(name)
ON CONFLICT ("name") DO NOTHING;
