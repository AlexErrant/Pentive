// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import { DbId } from "shared"

export interface Note {
  id: DbId
  templateId: DbId
  pushId: DbId | null
  pushTemplateId: DbId | null
  push: number | null
  ankiNoteId: number | null
  created: number
  modified: number
  tags: string
  fieldValues: string
}

export interface Template {
  id: DbId
  pushId: DbId | null
  push: number | null
  name: string
  css: string
  fields: string
  created: number
  modified: number
  templateType: string
}

export interface DB {
  note: Note
  template: Template
}
