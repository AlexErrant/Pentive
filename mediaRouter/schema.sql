CREATE TABLE IF NOT EXISTS media (
    accessorId       TEXT NOT NULL,    -- First character is U/N/T if userId/noteId/templateId, respectively.
    accessorFileName TEXT NOT NULL,
    objectId         TEXT,             -- e.g. r2/s3/b2 lookup key.
    PRIMARY KEY (accessorId, accessorFileName)
) STRICT;

CREATE INDEX media_object_index
ON media (objectId);
