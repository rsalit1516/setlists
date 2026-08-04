# Domain Context

Definitions for terms in this codebase whose meaning isn't obvious from the name alone.

## Musician

A member of the band's roster who can be assigned to gigs — a first-class record, not free
text. Every musician who plays a gig (regulars and one-off subs/guests alike) must exist in
the `Musician` table first; there is no free-text fallback.

## GigMusician

The assignment of a roster `Musician` to a specific `Gig`, carrying that musician's payout
share for that gig.
