/* eslint-disable @typescript-eslint/naming-convention */
import type { ColumnType } from "kysely"

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>

export interface MediaUser {
  mediaId: Buffer
  userId: string
}

export interface Nook {
  id: string
  displayName: string
  createdAt: Generated<Date>
  moderators: string
}

export interface Note {
  id: Buffer
  templateId: Buffer
  createdAt: Generated<Date>
  updatedAt: Date
  authorId: string
  fieldValues: string
  fts: string
  tags: string
  ankiId: number | null
}

export interface NoteComment {
  id: Buffer
  parentId: Buffer | null
  noteId: Buffer
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface NoteHistory {
  noteId: Buffer
  createdAt: Generated<Date>
  templateId: Buffer | null
  fieldValues: string
  tags: string
}

export interface NoteSubscriber {
  noteId: Buffer
  userId: string
  til: Date
}

export interface Post {
  id: Buffer
  title: string
  text: string
  nook: string
  authorId: string
}

export interface PostComment {
  id: Buffer
  parentId: Buffer | null
  postId: Buffer
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface PostSubscriber {
  postId: Buffer
  userId: string
  til: Date
}

export interface Template {
  id: Buffer
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
  id: Buffer
  parentId: Buffer | null
  templateId: Buffer
  text: string
  authorId: string
  history: string | null
  votes: string
}

export interface TemplateHistory {
  templateId: Buffer
  createdAt: Generated<Date>
  name: string | null
  authorId: string | null
  type: string | null
  fields: string | null
  css: string | null
  childTemplates: string | null
}

export interface TemplateSubscriber {
  templateId: Buffer
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
