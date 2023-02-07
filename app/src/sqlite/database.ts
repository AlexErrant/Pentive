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
  name: string | null
  css: string | null
  fields: string | null
  created: number | null
  modified: number | null
  templateType: string | null
}

export interface DB {
  note: Note
  template: Template
}
