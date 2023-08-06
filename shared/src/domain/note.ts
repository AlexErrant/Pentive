import {
  type NookId,
  type RemoteNoteId,
  type TemplateId,
  type NoteId,
} from "../brand.js"

export interface Note {
  id: NoteId
  templateId: TemplateId
  ankiNoteId?: number
  created: Date
  updated: Date
  tags: Set<string>
  fieldValues: Map<string, string>
  remotes: Map<NookId, RemoteNoteId | null>
}
