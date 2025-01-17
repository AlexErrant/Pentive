# What's up with the `media` and `Media_User` tables?

`media` has a PK that is an HMAC of `entityId` and `hash` - grep 69D0971A-FE47-4D4F-91B9-15A6FAA3CAF1. `entityId` is the PK of the associated template, note, comment, etc. We're using Ulids so template/note/comment PKs don't collide.

We aren't creating separate tables for each template/note/comment because `SELECT * FROM Media_Template WHERE hash = ... UNION SELECT * FROM Media_Note WHERE hash = ...` counts as two reads on PlanetScale, and we often want to `COUNT` how many instances of a media there are for the purposes of deduplication.

`Media_User` is a separate table because it doesn't fit the `entityId`/`hash` pattern.
