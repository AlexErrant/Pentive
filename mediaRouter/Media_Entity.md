# What's up with the `Media_Entity` and `Media_User` tables?

`Media_Entity` has a composite PK comprised of `entityId` and `i`. `entityId` is the PK of the associated template, note, comment, etc. We're using Ulids so template/note/comment PKs don't collide. `i` is the index of the media in the template/note/comment. We're using an unsigned tinyint so a max of 255 media is permitted per template/note/comment.

We aren't creating separate tables for each template/note/comment because `SELECT * FROM Media_Template WHERE mediaHash = ... UNION SELECT * FROM Media_Note WHERE mediaHash = ...` counts as two reads on PlanetScale, and we often want to `COUNT` how many instances of a media there are for the purposes of deduplication.

`Media_User` is a separate table because it doesn't fit the `entityId`/`i` pattern.
