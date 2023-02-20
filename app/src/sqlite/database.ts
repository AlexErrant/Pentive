// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import { DbId } from "shared"
import { MediaId, RemoteMediaNum } from "../domain/ids"

export interface Card {
  id: DbId
  pointer: string
  noteId: DbId
  deckIds: string
  created: number
  modified: number
  cardSettingId: DbId | null
  due: number
  state: number | null
}

export interface Media {
  id: MediaId
  created: number
  modified: number
  data: Uint8Array
}

export interface Note {
  id: DbId
  templateId: DbId
  remoteId: DbId | null
  pushTemplateId: DbId | null
  push: number | null
  ankiNoteId: number | null
  created: number
  modified: number
  tags: string
  fieldValues: string
}

export interface Plugin {
  id: DbId
  name: string
  created: number
  modified: number
  script: Uint8Array
}

export interface RemoteMedia {
  localEntityId: DbId
  i: RemoteMediaNum
  localMediaId: MediaId
  uploadDate: number | null
}

export interface Template {
  id: DbId
  remoteId: DbId | null
  push: number | null
  name: string
  css: string
  fields: string
  created: number
  modified: number
  templateType: string
}

export interface DB {
  card: Card
  media: Media
  note: Note
  plugin: Plugin
  remoteMedia: RemoteMedia
  template: Template
}
