-- Reverts 20260806182115_relax_gig_setlist_unique (#34): restores the strict
-- 1:1 between Gig and Setlist. #34's reuse-by-reference model let one Setlist
-- back multiple Gigs, which meant SetlistItem.wasPlayed (a per-performance
-- fact) was actually shared state across every gig reusing that setlist.
-- #41 replaces "reuse" with copy-on-create instead, so this constraint is
-- safe to restore — verified no Setlist currently backs more than one active
-- Gig before writing this migration.

-- CreateIndex
CREATE UNIQUE INDEX "Gig_setlistId_key" ON "Gig"("setlistId");
