


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."SetSection" AS ENUM (
    'SOUNDCHECK',
    'MAIN',
    'ENCORE'
);


ALTER TYPE "public"."SetSection" OWNER TO "postgres";


CREATE TYPE "public"."SongStatus" AS ENUM (
    'READY',
    'IN_PROGRESS',
    'WISH'
);


ALTER TYPE "public"."SongStatus" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Expense" (
    "id" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(65,30) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gigId" "text" NOT NULL
);


ALTER TABLE "public"."Expense" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Gig" (
    "id" "text" NOT NULL,
    "date" timestamp(3) without time zone NOT NULL,
    "notes" "text",
    "amountContracted" numeric(65,30),
    "amountPaid" numeric(65,30),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "venueId" "text" NOT NULL,
    "setlistId" "text" NOT NULL
);


ALTER TABLE "public"."Gig" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."GigMusician" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "share" numeric(65,30),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gigId" "text" NOT NULL
);


ALTER TABLE "public"."GigMusician" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Setlist" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Setlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."SetlistItem" (
    "id" "text" NOT NULL,
    "order" integer NOT NULL,
    "songId" "text" NOT NULL,
    "setlistId" "text" NOT NULL,
    "section" "public"."SetSection" DEFAULT 'MAIN'::"public"."SetSection" NOT NULL,
    "setNumber" integer DEFAULT 1 NOT NULL,
    "wasPlayed" boolean,
    "isUnplanned" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."SetlistItem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Song" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "artist" "text",
    "key" "text",
    "bpm" integer,
    "lyricsUrl" "text",
    "chartsUrl" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "singer" "text",
    "status" "public"."SongStatus" DEFAULT 'WISH'::"public"."SongStatus" NOT NULL,
    "keyboardRequired" boolean DEFAULT false NOT NULL,
    "durationSeconds" integer,
    "orientation" "text"
);


ALTER TABLE "public"."Song" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Venue" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Venue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."GigMusician"
    ADD CONSTRAINT "GigMusician_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Gig"
    ADD CONSTRAINT "Gig_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SetlistItem"
    ADD CONSTRAINT "SetlistItem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Setlist"
    ADD CONSTRAINT "Setlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Song"
    ADD CONSTRAINT "Song_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Venue"
    ADD CONSTRAINT "Venue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "Gig_setlistId_key" ON "public"."Gig" USING "btree" ("setlistId");



ALTER TABLE ONLY "public"."Expense"
    ADD CONSTRAINT "Expense_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "public"."Gig"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."GigMusician"
    ADD CONSTRAINT "GigMusician_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "public"."Gig"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Gig"
    ADD CONSTRAINT "Gig_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "public"."Setlist"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Gig"
    ADD CONSTRAINT "Gig_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."SetlistItem"
    ADD CONSTRAINT "SetlistItem_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "public"."Setlist"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."SetlistItem"
    ADD CONSTRAINT "SetlistItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON UPDATE CASCADE ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."Expense" TO "anon";
GRANT ALL ON TABLE "public"."Expense" TO "authenticated";
GRANT ALL ON TABLE "public"."Expense" TO "service_role";



GRANT ALL ON TABLE "public"."Gig" TO "anon";
GRANT ALL ON TABLE "public"."Gig" TO "authenticated";
GRANT ALL ON TABLE "public"."Gig" TO "service_role";



GRANT ALL ON TABLE "public"."GigMusician" TO "anon";
GRANT ALL ON TABLE "public"."GigMusician" TO "authenticated";
GRANT ALL ON TABLE "public"."GigMusician" TO "service_role";



GRANT ALL ON TABLE "public"."Setlist" TO "anon";
GRANT ALL ON TABLE "public"."Setlist" TO "authenticated";
GRANT ALL ON TABLE "public"."Setlist" TO "service_role";



GRANT ALL ON TABLE "public"."SetlistItem" TO "anon";
GRANT ALL ON TABLE "public"."SetlistItem" TO "authenticated";
GRANT ALL ON TABLE "public"."SetlistItem" TO "service_role";



GRANT ALL ON TABLE "public"."Song" TO "anon";
GRANT ALL ON TABLE "public"."Song" TO "authenticated";
GRANT ALL ON TABLE "public"."Song" TO "service_role";



GRANT ALL ON TABLE "public"."Venue" TO "anon";
GRANT ALL ON TABLE "public"."Venue" TO "authenticated";
GRANT ALL ON TABLE "public"."Venue" TO "service_role";



GRANT ALL ON TABLE "public"."_prisma_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































