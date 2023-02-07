// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import { DbId } from "shared"

export interface Note {
  id: DbId
  templateId: DbId | null
  pushId: DbId | null
  pushTemplateId: DbId | null
  push: number | null
  ankiNoteId: number | null
  created: number | null
  modified: number | null
  tags: string | null
  fieldValues: string | null
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
