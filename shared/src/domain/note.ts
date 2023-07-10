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

export const sampleNote: Note = {
  id: "dZA8bN6wQMCfjwAAxwL72w" as NoteId,
  created: new Date(),
  updated: new Date(),
  templateId: "fanOeCfrTeGKVgAAek3FQg" as TemplateId,
  tags: new Set<string>(),
  fieldValues: new Map([
    ["front", "Question"],
    ["back", `Answer <img src="tree.jpg" >`],
  ]),
  remotes: new Map(),
}
