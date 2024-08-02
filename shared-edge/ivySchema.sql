create table media_Entity
(
    entityId  BLOB    not null,
    i         INTEGER not null,
    mediaHash BLOB    not null,
    primary key (entityId, i)
) STRICT;

create index media_Entity_mediaHash_idx
    on media_Entity (mediaHash);

create table media_User
(
    mediaHash BLOB not null,
    userId    TEXT not null,
    primary key (mediaHash, userId),
    foreign key (userId) references user(id)
) STRICT;

create index media_User_mediaHash_idx
    on media_User (mediaHash);

create table nook
(
    id          TEXT    not null
        primary key,
    created     INTEGER not null default (cast(strftime('%s','now') as int)), -- https://stackoverflow.com/a/29420016
    moderators  TEXT    not null,
    description TEXT    not null,
    sidebar     TEXT    not null,
    type        INTEGER not null,
    approved    TEXT    null
) STRICT;

create table note
(
    id               BLOB    not null
        primary key,
    templateId       BLOB    not null,
    created          INTEGER not null default (cast(strftime('%s','now') as int)),
    updated          INTEGER not null default (cast(strftime('%s','now') as int)),
    authorId         TEXT    not null,
    fieldValues      TEXT    not null,
    fts              TEXT    not null,
    tags             TEXT    not null,
    subscribersCount INTEGER not null default '0',
    commentsCount    INTEGER not null default '0',
    ankiId           INTEGER null,
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) STRICT;

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
    updated  INTEGER not null default (cast(strftime('%s','now') as int)),
    text     TEXT    not null,
    authorId TEXT    not null,
    history  TEXT    null,
    votes    TEXT    not null,
    level    INTEGER not null,
    foreign key (noteId) references note(id),
    foreign key (authorId) references user(id)
) STRICT;

create index noteComment_authorId_idx
    on noteComment (authorId);

create index noteComment_noteId_idx
    on noteComment (noteId);

create table noteHistory
(
    noteId      BLOB    not null,
    created     INTEGER not null default (cast(strftime('%s','now') as int)),
    templateId  BLOB    null,
    fieldValues TEXT    not null,
    tags        TEXT    not null,
    primary key (noteId, created),
    foreign key (noteId) references note(id),
    foreign key (templateId) references template(id)
) STRICT;

create index noteHistory_noteId_idx
    on noteHistory (noteId);

create table noteSubscriber
(
    noteId BLOB    not null,
    userId TEXT    not null,
    til    INTEGER not null default (cast(strftime('%s','now') as int)),
    primary key (noteId, userId),
    foreign key (noteId) references note(id),
    foreign key (userId) references user(id)
) STRICT;

create index noteSubscriber_noteId_idx
    on noteSubscriber (noteId);

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
) STRICT;

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
    updated  INTEGER not null default (cast(strftime('%s','now') as int)),
    text     TEXT    not null,
    authorId TEXT    not null,
    history  TEXT    null,
    votes    TEXT    not null,
    level    INTEGER not null,
    foreign key (postId) references post(id),
    foreign key (authorId) references user(id)
) STRICT;

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
) STRICT;

create index postSubscriber_postId_idx
    on postSubscriber (postId);

create index postSubscriber_userId_idx
    on postSubscriber (userId);

create table template
(
    id               BLOB    not null
        primary key,
    created          INTEGER not null default (cast(strftime('%s','now') as int)),
    updated          INTEGER not null default (cast(strftime('%s','now') as int)),
    name             TEXT    not null,
    nook             TEXT    not null,
    type             TEXT    not null,
    fields           TEXT    not null,
    css              TEXT    not null,
    ankiId           INTEGER null,
    commentsCount    INTEGER default '0'                                 not null,
    subscribersCount INTEGER default '0'                                 not null,
    foreign key (nook) references nook(id)
) STRICT;

create index template_ankiId_idx
    on template (ankiId);

create index template_nook_idx
    on template (nook);

create table templateComment
(
    id         BLOB    not null
        primary key,
    parentId   BLOB    null,
    templateId BLOB    not null,
    created    INTEGER not null default (cast(strftime('%s','now') as int)),
    updated    INTEGER not null default (cast(strftime('%s','now') as int)),
    text       TEXT    not null,
    authorId   TEXT    not null,
    history    TEXT    null,
    votes      TEXT    not null,
    level      INTEGER not null,
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) STRICT;

create index templateComment_authorId_idx
    on templateComment (authorId);

create index templateComment_templateId_idx
    on templateComment (templateId);

create table templateHistory
(
    templateId BLOB    not null,
    created    INTEGER not null default (cast(strftime('%s','now') as int)),
    name       TEXT    null,
    authorId   TEXT    null,
    type       TEXT    null,
    fields     TEXT    null,
    css        TEXT    null,
    primary key (templateId, created),
    foreign key (templateId) references template(id),
    foreign key (authorId) references user(id)
) STRICT;

create index templateHistory_authorId_idx
    on templateHistory (authorId);

create index templateHistory_templateId_idx
    on templateHistory (templateId);

create table templateSubscriber
(
    templateId BLOB    not null,
    userId     TEXT    not null,
    til        INTEGER not null default (cast(strftime('%s','now') as int)),
    primary key (templateId, userId),
    foreign key (templateId) references template(id),
    foreign key (userId) references user(id)
) STRICT;

create index templateSubscriber_templateId_idx
    on templateSubscriber (templateId);

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
) STRICT;
