-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToSong" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GenreToSong_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "_GenreToSong_B_index" ON "_GenreToSong"("B");

-- AddForeignKey
ALTER TABLE "_GenreToSong" ADD CONSTRAINT "_GenreToSong_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToSong" ADD CONSTRAINT "_GenreToSong_B_fkey" FOREIGN KEY ("B") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: split legacy Song.orientation (freeform, comma-separated text) into Genre
-- rows -- case-insensitively deduped -- and link each song to its genre(s), before the column
-- that fed them is dropped below.
INSERT INTO "Genre" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    name,
    true,
    now(),
    now()
FROM (
    SELECT DISTINCT ON (lower(name)) name
    FROM (
        SELECT trim(part) AS name
        FROM "Song"
        CROSS JOIN LATERAL unnest(string_to_array("Song"."orientation", ',')) AS part
        WHERE "Song"."orientation" IS NOT NULL AND trim(part) <> ''
    ) split_names
    ORDER BY lower(name), name
) deduped_names;

INSERT INTO "_GenreToSong" ("A", "B")
SELECT DISTINCT g."id", s."id"
FROM "Song" s
CROSS JOIN LATERAL unnest(string_to_array(s."orientation", ',')) AS part
JOIN "Genre" g ON lower(g."name") = lower(trim(part))
WHERE s."orientation" IS NOT NULL AND trim(part) <> '';

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "orientation";
