import {
  type NookId,
  type RemoteNoteId,
  type TemplateId,
  type NoteId,
} from "shared"

export interface Note {
  readonly id: NoteId
  readonly templateId: TemplateId
  ankiNoteId?: number
  readonly created: Date
  readonly updated: Date
  readonly tags: ReadonlySet<string>
  readonly fieldValues: Map<string, string>
  readonly remotes: Map<NookId, RemoteNoteId | null>
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
