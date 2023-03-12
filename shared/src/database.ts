/* eslint-disable @typescript-eslint/naming-convention */
import type { ColumnType } from "kysely"
import type { DbId, NookId } from "./brand"

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>

export interface MediaUser {
  mediaHash: DbId
  userId: string
}

export interface MediaEntity {
  mediaHash: DbId
  i: number
  entityId: DbId
}

export interface Nook {
  id: string
  displayName: string
  createdAt: Generated<Date>
  moderators: string
}

export interface Note {
  id: DbId
  templateId: DbId
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
  authorId: string
  fieldValues: string
  fts: string
  tags: string
  ankiId: number | null
  subscribersCount: Generated<number>
  commentsCount: Generated<number>
}

export interface NoteComment {
  id: DbId
  parentId: DbId | null
  noteId: DbId
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
  text: string
  authorId: string
  history: string | null
  votes: string
  level: number
}

export interface NoteHistory {
  noteId: DbId
  createdAt: Generated<Date>
  templateId: DbId | null
  fieldValues: string
  tags: string
}

export interface NoteSubscriber {
  noteId: DbId
  userId: string
  til: Generated<Date>
}

export interface Post {
  id: DbId
  title: string
  text: string
  nook: string
  authorId: string
}

export interface PostComment {
  id: DbId
  parentId: DbId | null
  postId: DbId
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
  text: string
  authorId: string
  history: string | null
  votes: string
  level: number
}

export interface PostSubscriber {
  postId: DbId
  userId: string
  til: Generated<Date>
}

export interface Template {
  id: DbId
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
  name: string
  nook: NookId
  type: string
  fields: string
  css: string
  ankiId: number | null
}

export interface TemplateComment {
  id: DbId
  parentId: DbId | null
  templateId: DbId
  createdAt: Generated<Date>
  updatedAt: Generated<Date>
  text: string
  authorId: string
  history: string | null
  votes: string
  level: number
}

export interface TemplateHistory {
  templateId: DbId
  createdAt: Generated<Date>
  name: string | null
  authorId: string | null
  type: string | null
  fields: string | null
  css: string | null
}

export interface TemplateSubscriber {
  templateId: DbId
  userId: string
  til: Generated<Date>
}

export interface User {
  id: string
  displayName: string
  createdAt: Generated<Date>
}

export interface DB {
  Media_User: MediaUser
  Media_Entity: MediaEntity
  Nook: Nook
  Note: Note
  NoteComment: NoteComment
  NoteHistory: NoteHistory
  NoteSubscriber: NoteSubscriber
  Post: Post
  PostComment: PostComment
  PostSubscriber: PostSubscriber
  Template: Template
  TemplateComment: TemplateComment
  TemplateHistory: TemplateHistory
  TemplateSubscriber: TemplateSubscriber
  User: User
}
