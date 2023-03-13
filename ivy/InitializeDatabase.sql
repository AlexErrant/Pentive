create table padawan
(
    name          text                     not null
        primary key,
    created       timestamp with time zone not null,
    notifications json[]                   not null,
    nooks         json                     not null
);

create table nook
(
    name     text                     not null
        primary key,
    created  timestamp with time zone not null,
    curators json                     not null,
    padawans integer                  not null
);
create index on nook (padawans);

create table posts
(
    id        uuid                     not null
        primary key,
    content   text                     not null,
    nook      text                     not null
        references nook,
    author    text                     not null
        references padawan,
    created   timestamp with time zone not null,
    updated   timestamp with time zone not null,
    tags      json                     not null,
    comments  json                     not null,
    followers integer                  not null
);
create index on posts (nook);
create index on posts (author);
create index on posts (created);
create index on posts (followers);

create table template
(
    id              uuid                     not null
        primary key,
    name            text                     not null,
    nook            text                     not null
        references nook,
    author          text                     not null
        references padawan,
    created         timestamp with time zone not null,
    updated         timestamp with time zone not null,
    type            text                     not null,
    fields          json                     not null,
    css             text                     not null,
    child_templates json                     not null,
    history         json                     not null,
    tags            json                     not null,
    comments        json                     not null,
    followers       integer                  not null,
    anki_id         bigint
);
create index on template (nook);
create index on template (author);
create index on template (created);
create index on template (updated);
create index on template (type);
create index on template (followers);
create index on template (anki_id);

create table card
(
    id           uuid                     not null
        primary key,
    title        text,
    nook         text                     not null
        references nook,
    created      timestamp with time zone not null,
    updated      timestamp with time zone not null,
    author       text                     not null
        references padawan,
    type         text                     not null,
    field_values json                     not null,
    template_id  uuid                     not null
        references template,
    history      json                     not null,
    tags         json                     not null,
    comments     json                     not null,
    followers    integer                  not null,
    pointer      text                     not null,
    parent_id    uuid
        references card,
    anki_id      bigint
);
create index on card (nook);
create index on card (created);
create index on card (updated);
create index on card (author);
create index on card (type);
create index on card (template_id);
create index on card (followers);
create index on card (parent_id);
create index on card (anki_id);

create table nook_allowed_templates
(
    nook     text not null
        references nook,
    template uuid not null
        references template,
    primary key (nook, template)
);

create table card_followers
(
    card    uuid not null
        references card,
    padawan text not null
        references padawan,
    primary key (card, padawan)
);

create table template_followers
(
    template uuid not null
        references template,
    padawan  text not null
        references padawan,
    primary key (template, padawan)
);
