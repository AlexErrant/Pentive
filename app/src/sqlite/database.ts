// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import { LDbId } from "shared"
import { MediaId, RemoteMediaNum } from "../domain/ids"

export interface Card {
  id: LDbId
  pointer: string
  noteId: LDbId
  deckIds: string
  created: number
  modified: number
  cardSettingId: LDbId | null
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
  id: LDbId
  templateId: LDbId
  remoteId: LDbId | null
  pushTemplateId: LDbId | null
  push: number | null
  ankiNoteId: number | null
  created: number
  modified: number
  tags: string
  fieldValues: string
}

export interface Plugin {
  id: LDbId
  name: string
  created: number
  modified: number
  script: Uint8Array
}

export interface RemoteMedia {
  localEntityId: LDbId
  i: RemoteMediaNum
  localMediaId: MediaId
  uploadDate: number | null
}

export interface Template {
  id: LDbId
  name: string
  css: string
  fields: string
  created: number
  modified: number
  templateType: string
  ankiId: number | null
}

export interface RemoteTemplate {
  localId: LDbId
  nook: string
  remoteId: LDbId | null
  uploadDate: number | null
}

export interface DB {
  card: Card
  media: Media
  note: Note
  plugin: Plugin
  remoteMedia: RemoteMedia
  template: Template
  remoteTemplate: RemoteTemplate
}
