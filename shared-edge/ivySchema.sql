create table media
(
    id        BLOB not null primary key,
    entityId  BLOB not null,
    hash      BLOB not null
) WITHOUT ROWID, STRICT;

create index media_hash_idx
    on media (hash);

create index media_entityId_idx
    on media (entityId);

create table media_User
(
    mediaHash BLOB not null,
    userId    TEXT not null,
    primary key (mediaHash, userId),
    foreign key (userId) references user(id)
) WITHOUT ROWID, STRICT;

create table nook
(
    id          TEXT    not null primary key,
    created     INTEGER not null default (cast(strftime('%s','now') as int)), -- https://stackoverflow.com/a/29420016
    moderators  TEXT    not null,
    description TEXT    not null,
    sidebar     TEXT    not null,
    type        INTEGER not null,
    approved    TEXT    null
) WITHOUT ROWID, STRICT;

create table note
(
    id               BLOB    not null primary key,
    hexId            TEXT    GENERATED ALWAYS AS (hex(id)),
    templateId       BLOB    not null,
    created          INTEGER GENERATED ALWAYS AS (
      ((instr('123456789ABCDEF', substr(hexId, 1,1))) << 44) |
      ((instr('123456789ABCDEF', substr(hexId, 2,1))) << 40) |
      ((instr('123456789ABCDEF', substr(hexId, 3,1))) << 36) |
      ((instr('123456789ABCDEF', substr(hexId, 4,1))) << 32) |
      ((instr('123456789ABCDEF', substr(hexId, 5,1))) << 28) |
      ((instr('123456789ABCDEF', substr(hexId, 6,1))) << 24) |
      ((instr('123456789ABCDEF', substr(hexId, 7,1))) << 20) |
      ((instr('123456789ABCDEF', substr(hexId, 8,1))) << 16) |
      ((instr('123456789ABCDEF', substr(hexId, 9,1))) << 12) |
      ((instr('123456789ABCDEF', substr(hexId,10,1))) <<  8) |
      ((instr('123456789ABCDEF', substr(hexId,11,1))) <<  4) |
      ((instr('123456789ABCDEF', substr(hexId,12,1)))      )
    ) VIRTUAL,
    edited           INTEGER not null default (cast(strftime('%s','now') as int)),
    authorId         TEXT    not null,
    fieldValues      TEXT    not null,
    fts              TEXT    not null,
    tags             TEXT    not null,
    status           INTEGER not null,
    subscribersCount INTEGER not null default '0',
    commentsCount    INTEGER not null default '0',
    ankiId           INTEGER null,
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index note_edited_idx
    on note (edited);

create index note_commentsCount_idx
    on note (commentsCount);

create index note_subscribersCount_idx
    on note (subscribersCount);

create index note_status_idx
    on note (status);

create index note_ankiId_idx
    on note (ankiId);

create index note_authorId_idx
    on note (authorId);

create index note_templateId_idx
    on note (templateId);

create table noteComment
(
    id       BLOB    not null primary key,
    parentId BLOB    null,
    noteId   BLOB    not null,
    created  INTEGER not null default (cast(strftime('%s','now') as int)),
    edited   INTEGER not null default (cast(strftime('%s','now') as int)),
    text     TEXT    not null,
    authorId TEXT    not null,
    history  BLOB    null,
    votes    TEXT    not null,
    level    INTEGER not null,
    foreign key (noteId) references note(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index noteComment_authorId_idx
    on noteComment (authorId);

create index noteComment_noteId_idx
    on noteComment (noteId);

create table noteProposal
(
    noteId      BLOB    not null,
    created     INTEGER not null default (cast(strftime('%s','now') as int)),
    authorId    TEXT    not null,
    delta       BLOB    not null,
    status      INTEGER not null,
    primary key (noteId, created),
    foreign key (noteId) references note(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index noteProposal_authorId_idx
    on noteProposal (authorId);

create table noteSubscriber
(
    noteId BLOB    not null,
    userId TEXT    not null,
    til    INTEGER not null default (cast(strftime('%s','now') as int)),
    primary key (noteId, userId),
    foreign key (noteId) references note(id),
    foreign key (userId) references user(id)
) WITHOUT ROWID, STRICT;

create index noteSubscriber_userId_idx
    on noteSubscriber (userId);

create table post
(
    id       BLOB not null primary key,
    title    TEXT not null,
    text     TEXT not null,
    nook     TEXT not null,
    authorId TEXT not null,
    foreign key (authorId) references user(id),
    foreign key (nook) references nook(id)
) WITHOUT ROWID, STRICT;

create index post_authorId_idx
    on post (authorId);

create index post_nook_idx
    on post (nook);

create table postComment
(
    id       BLOB    not null primary key,
    parentId BLOB    null,
    postId   BLOB    not null,
    created  INTEGER not null default (cast(strftime('%s','now') as int)),
    edited   INTEGER not null default (cast(strftime('%s','now') as int)),
    text     TEXT    not null,
    authorId TEXT    not null,
    history  BLOB    null,
    votes    TEXT    not null,
    level    INTEGER not null,
    foreign key (postId) references post(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index postComment_authorId_idx
    on postComment (authorId);

create index postComment_postId_idx
    on postComment (postId);

create table postSubscriber
(
    postId BLOB    not null,
    userId TEXT    not null,
    til    INTEGER not null default (cast(strftime('%s','now') as int)),
    primary key (postId, userId),
    foreign key (postId) references post(id),
    foreign key (userId) references user(id)
) WITHOUT ROWID, STRICT;

create index postSubscriber_userId_idx
    on postSubscriber (userId);

create table template
(
    id               BLOB    not null primary key,
    created          INTEGER not null default (cast(strftime('%s','now') as int)),
    edited           INTEGER not null default (cast(strftime('%s','now') as int)),
    name             TEXT    not null,
    nook             TEXT    not null,
    type             TEXT    not null,
    fields           TEXT    not null,
    css              TEXT    not null,
    ankiId           INTEGER null,
    status           INTEGER not null,
    commentsCount    INTEGER not null default '0',
    subscribersCount INTEGER not null default '0',
    foreign key (nook) references nook(id)
) WITHOUT ROWID, STRICT;

create index template_ankiId_idx
    on template (ankiId);

create index template_nook_idx
    on template (nook);

create table templateComment
(
    id         BLOB    not null primary key,
    parentId   BLOB    null,
    templateId BLOB    not null,
    created    INTEGER not null default (cast(strftime('%s','now') as int)),
    edited     INTEGER not null default (cast(strftime('%s','now') as int)),
    text       TEXT    not null,
    authorId   TEXT    not null,
    history    BLOB    null,
    votes      TEXT    not null,
    level      INTEGER not null,
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index templateComment_authorId_idx
    on templateComment (authorId);

create index templateComment_templateId_idx
    on templateComment (templateId);

create table templateProposal
(
    templateId BLOB    not null,
    created    INTEGER not null default (cast(strftime('%s','now') as int)),
    authorId   TEXT    not null,
    delta      BLOB    not null,
    status     INTEGER not null,
    primary key (templateId, created),
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) WITHOUT ROWID, STRICT;

create index templateProposal_authorId_idx
    on templateProposal (authorId);

create table templateSubscriber
(
    templateId BLOB    not null,
    userId     TEXT    not null,
    til        INTEGER not null default (cast(strftime('%s','now') as int)),
    primary key (templateId, userId),
    foreign key (templateId) references template(id),
    foreign key (userId) references user(id)
) WITHOUT ROWID, STRICT;

create index templateSubscriber_userId_idx
    on templateSubscriber (userId);

create table user
(
    id      TEXT    not null primary key,
    email   TEXT    not null,
    created INTEGER not null default (cast(strftime('%s','now') as int)),
    peer    TEXT    null,
    constraint user_email_key
        unique (email)
) WITHOUT ROWID, STRICT;

insert into user (id, email, created, peer) values
    ('Griddle', 'griddle@pentive.com', 0, null),
    ('Harry'  , 'harry@pentive.com'  , 0, null),
    ('Campal' , 'campal@pentive.com' , 0, null);
