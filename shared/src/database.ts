/* eslint-disable @typescript-eslint/naming-convention */
import type { ColumnType } from "kysely"
import type { Base64 } from "./brand"

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>

export interface MediaUser {
  mediaId: Base64
  userId: string
}

export interface Nook {
  id: string
  displayName: string
  createdAt: Generated<Date>
  moderators: string
}

export interface Note {
  id: Base64
  templateId: Base64
  createdAt: Generated<Date>
  updatedAt: Date
  authorId: string
  fieldValues: string
  fts: string
  tags: string
  ankiId: number | null
}

export interface NoteComment {
  id: Base64
  parentId: Base64 | null
  noteId: Base64
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface NoteHistory {
  noteId: Base64
  createdAt: Generated<Date>
  templateId: Base64 | null
  fieldValues: string
  tags: string
}

export interface NoteSubscriber {
  noteId: Base64
  userId: string
  til: Date
}

export interface Post {
  id: Base64
  title: string
  text: string
  nook: string
  authorId: string
}

export interface PostComment {
  id: Base64
  parentId: Base64 | null
  postId: Base64
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface PostSubscriber {
  postId: Base64
  userId: string
  til: Date
}

export interface Template {
  id: Base64
  createdAt: Generated<Date>
  updatedAt: Date
  name: string
  nook: string
  type: string
  fields: string
  css: string
  childTemplates: string
  ankiId: number | null
}

export interface TemplateComment {
  id: Base64
  parentId: Base64 | null
  templateId: Base64
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface TemplateHistory {
  templateId: Base64
  createdAt: Generated<Date>
  name: string | null
  authorId: string | null
  type: string | null
  fields: string | null
  css: string | null
  childTemplates: string | null
}

export interface TemplateSubscriber {
  templateId: Base64
  userId: string
  til: Date
}

export interface User {
  id: string
  displayName: string
  createdAt: Generated<Date>
}

export interface DB {
  Media_User: MediaUser
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
