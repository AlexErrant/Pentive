-- we don't know how to generate root <with-no-name> (class Root) :(

grant select on _vt.* to orc_client_user;

grant select on performance_schema.* to 'mysql.session'@localhost;

grant delete, drop, select, update on performance_schema.* to vt_monitoring@localhost;

grant trigger on sys.* to 'mysql.sys'@localhost;

grant audit_abort_exempt, firewall_exempt, select, system_user on *.* to 'mysql.infoschema'@localhost;

grant audit_abort_exempt, authentication_policy_admin, backup_admin, clone_admin, connection_admin, firewall_exempt, persist_ro_variables_admin, session_variables_admin, shutdown, super, system_user, system_variables_admin, telemetry_log_admin on *.* to 'mysql.session'@localhost;

grant audit_abort_exempt, firewall_exempt, system_user on *.* to 'mysql.sys'@localhost;

grant process, reload, replication slave, super, telemetry_log_admin on *.* to orc_client_user;

grant alter, alter routine, application_password_admin, audit_abort_exempt, audit_admin, authentication_policy_admin, backup_admin, binlog_admin, binlog_encryption_admin, clone_admin, connection_admin, create, create role, create routine, create tablespace, create temporary tables, create user, create view, delete, drop, drop role, encryption_key_admin, event, execute, file, firewall_exempt, flush_optimizer_costs, flush_status, flush_tables, flush_user_resources, group_replication_admin, index, innodb_redo_log_archive, innodb_redo_log_enable, insert, lock tables, passwordless_user_admin, persist_ro_variables_admin, process, references, reload, replication client, replication slave, replication_applier, replication_slave_admin, resource_group_admin, resource_group_user, role_admin, select, sensitive_variables_observer, service_connection_admin, session_variables_admin, set_user_id, show databases, show view, show_routine, shutdown, super, system_user, system_variables_admin, table_encryption_admin, telemetry_log_admin, trigger, update, xa_recover_admin, grant option on *.* to root@localhost;

grant alter, alter routine, create, create role, create routine, create temporary tables, create user, create view, delete, drop, drop role, event, execute, file, index, insert, lock tables, passwordless_user_admin, process, references, reload, replication client, replication slave, select, show databases, show view, trigger, update on *.* to vt_allprivs@localhost;

grant alter, alter routine, create, create role, create routine, create temporary tables, create user, create view, delete, drop, drop role, event, execute, file, index, insert, lock tables, passwordless_user_admin, process, references, reload, replication client, select, show databases, show view, trigger, update on *.* to vt_app@localhost;

grant process, select, show databases on *.* to vt_appdebug@localhost;

grant alter, alter routine, application_password_admin, audit_abort_exempt, audit_admin, authentication_policy_admin, backup_admin, binlog_admin, binlog_encryption_admin, clone_admin, connection_admin, create, create role, create routine, create tablespace, create temporary tables, create user, create view, delete, drop, drop role, encryption_key_admin, event, execute, file, firewall_exempt, flush_optimizer_costs, flush_status, flush_tables, flush_user_resources, group_replication_admin, index, innodb_redo_log_archive, innodb_redo_log_enable, insert, lock tables, passwordless_user_admin, persist_ro_variables_admin, process, references, reload, replication client, replication slave, replication_applier, replication_slave_admin, resource_group_admin, resource_group_user, role_admin, select, sensitive_variables_observer, service_connection_admin, session_variables_admin, set_user_id, show databases, show view, show_routine, shutdown, super, system_user, system_variables_admin, table_encryption_admin, telemetry_log_admin, trigger, update, xa_recover_admin, grant option on *.* to vt_dba@localhost;

grant alter, alter routine, create, create role, create routine, create temporary tables, create user, create view, delete, drop, drop role, event, execute, file, index, insert, lock tables, passwordless_user_admin, process, references, reload, replication client, replication slave, select, show databases, show view, trigger, update on *.* to vt_filtered@localhost;

grant process, reload, replication client, select, super, telemetry_log_admin on *.* to vt_monitoring@localhost;

grant replication slave on *.* to vt_repl;

create table media_Entity
(
    entityId  binary(16)       not null,
    i         tinyint unsigned not null,
    mediaHash binary(32)       not null,
    primary key (entityId, i)
)
    collate = utf8mb4_unicode_ci;

create index media_Entity_mediaHash_idx
    on media_Entity (mediaHash);

create table media_User
(
    mediaHash binary(32)  not null,
    userId    varchar(21) not null,
    primary key (mediaHash, userId)
)
    collate = utf8mb4_unicode_ci;

create index media_User_mediaHash_idx
    on media_User (mediaHash);

create table nook
(
    id          varchar(21)                              not null
        primary key,
    created     datetime(3) default CURRENT_TIMESTAMP(3) not null,
    moderators  text                                     not null,
    description text                                     not null,
    sidebar     text                                     not null,
    type        tinyint unsigned                         not null,
    approved    text                                     null
)
    collate = utf8mb4_unicode_ci;

create table note
(
    id               binary(16)                                      not null
        primary key,
    templateId       binary(16)                                      not null,
    created          datetime(3)        default CURRENT_TIMESTAMP(3) not null,
    updated          datetime(3)        default CURRENT_TIMESTAMP(3) not null,
    authorId         varchar(21)                                     not null,
    fieldValues      text                                            not null,
    fts              text                                            not null,
    tags             text                                            not null,
    subscribersCount smallint unsigned  default '0'                  not null,
    commentsCount    mediumint unsigned default '0'                  not null,
    ankiId           bigint unsigned                                 null
)
    collate = utf8mb4_unicode_ci;

create index note_ankiId_idx
    on note (ankiId);

create index note_authorId_idx
    on note (authorId);

create fulltext index note_fts_idx
    on note (fts);

create index note_templateId_idx
    on note (templateId);

create table noteComment
(
    id       binary(16)                               not null
        primary key,
    parentId binary(16)                               null,
    noteId   binary(16)                               not null,
    created  datetime(3) default CURRENT_TIMESTAMP(3) not null,
    updated  datetime(3) default CURRENT_TIMESTAMP(3) not null,
    text     text                                     not null,
    authorId varchar(21)                              not null,
    history  text                                     null,
    votes    text                                     not null,
    level    tinyint unsigned                         not null
)
    collate = utf8mb4_unicode_ci;

create index noteComment_authorId_idx
    on noteComment (authorId);

create index noteComment_noteId_idx
    on noteComment (noteId);

create table noteHistory
(
    noteId      binary(16)                               not null,
    created     datetime(3) default CURRENT_TIMESTAMP(3) not null,
    templateId  binary(16)                               null,
    fieldValues text                                     not null,
    tags        text                                     not null,
    primary key (noteId, created)
)
    collate = utf8mb4_unicode_ci;

create index noteHistory_noteId_idx
    on noteHistory (noteId);

create table noteSubscriber
(
    noteId binary(16)                               not null,
    userId varchar(21)                              not null,
    til    datetime(3) default CURRENT_TIMESTAMP(3) not null,
    primary key (noteId, userId)
)
    collate = utf8mb4_unicode_ci;

create index noteSubscriber_noteId_idx
    on noteSubscriber (noteId);

create index noteSubscriber_userId_idx
    on noteSubscriber (userId);

create table post
(
    id       binary(16)   not null
        primary key,
    title    varchar(255) not null,
    text     text         not null,
    nook     varchar(21)  not null,
    authorId varchar(21)  not null
)
    collate = utf8mb4_unicode_ci;

create index post_authorId_idx
    on post (authorId);

create index post_nook_idx
    on post (nook);

create table postComment
(
    id       binary(16)                               not null
        primary key,
    parentId binary(16)                               null,
    postId   binary(16)                               not null,
    created  datetime(3) default CURRENT_TIMESTAMP(3) not null,
    updated  datetime(3) default CURRENT_TIMESTAMP(3) not null,
    text     text                                     not null,
    authorId varchar(21)                              not null,
    history  text                                     null,
    votes    text                                     not null,
    level    tinyint unsigned                         not null
)
    collate = utf8mb4_unicode_ci;

create index postComment_authorId_idx
    on postComment (authorId);

create index postComment_postId_idx
    on postComment (postId);

create table postSubscriber
(
    postId binary(16)                               not null,
    userId varchar(21)                              not null,
    til    datetime(3) default CURRENT_TIMESTAMP(3) not null,
    primary key (postId, userId)
)
    collate = utf8mb4_unicode_ci;

create index postSubscriber_postId_idx
    on postSubscriber (postId);

create index postSubscriber_userId_idx
    on postSubscriber (userId);

create table template
(
    id               binary(16)                                      not null
        primary key,
    created          datetime(3)        default CURRENT_TIMESTAMP(3) not null,
    updated          datetime(3)        default CURRENT_TIMESTAMP(3) not null,
    name             varchar(255)                                    not null,
    nook             varchar(21)                                     not null,
    type             text                                            not null,
    fields           text                                            not null,
    css              text                                            not null,
    ankiId           bigint unsigned                                 null,
    commentsCount    mediumint unsigned default '0'                  not null,
    subscribersCount smallint unsigned  default '0'                  not null
)
    collate = utf8mb4_unicode_ci;

create index template_ankiId_idx
    on template (ankiId);

create index template_nook_idx
    on template (nook);

create table templateComment
(
    id         binary(16)                               not null
        primary key,
    parentId   binary(16)                               null,
    templateId binary(16)                               not null,
    created    datetime(3) default CURRENT_TIMESTAMP(3) not null,
    updated    datetime(3) default CURRENT_TIMESTAMP(3) not null,
    text       text                                     not null,
    authorId   varchar(21)                              not null,
    history    text                                     null,
    votes      text                                     not null,
    level      tinyint unsigned                         not null
)
    collate = utf8mb4_unicode_ci;

create index templateComment_authorId_idx
    on templateComment (authorId);

create index templateComment_templateId_idx
    on templateComment (templateId);

create table templateHistory
(
    templateId binary(16)                               not null,
    created    datetime(3) default CURRENT_TIMESTAMP(3) not null,
    name       varchar(255)                             null,
    authorId   varchar(21)                              null,
    type       varchar(21)                              null,
    fields     text                                     null,
    css        text                                     null,
    primary key (templateId, created)
)
    collate = utf8mb4_unicode_ci;

create index templateHistory_authorId_idx
    on templateHistory (authorId);

create index templateHistory_templateId_idx
    on templateHistory (templateId);

create table templateSubscriber
(
    templateId binary(16)                               not null,
    userId     varchar(21)                              not null,
    til        datetime(3) default CURRENT_TIMESTAMP(3) not null,
    primary key (templateId, userId)
)
    collate = utf8mb4_unicode_ci;

create index templateSubscriber_templateId_idx
    on templateSubscriber (templateId);

create index templateSubscriber_userId_idx
    on templateSubscriber (userId);

create table user
(
    id      varchar(21)                              not null
        primary key,
    email   varchar(254)                             not null,
    created datetime(3) default CURRENT_TIMESTAMP(3) not null,
    peer    json                                     null,
    constraint user_email_key
        unique (email)
)
    collate = utf8mb4_unicode_ci;

