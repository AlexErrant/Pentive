import { TemplateId, RemoteCardId, RemoteTemplateId, NoteId } from "./ids"

export interface Note {
  readonly id: NoteId
  readonly templateId: TemplateId
  readonly remoteId?: RemoteCardId
  readonly pushTemplateId?: RemoteTemplateId
  readonly push?: true
  readonly ankiNoteId?: number
  readonly created: Date
  readonly modified: Date
  readonly tags: ReadonlySet<string>
  readonly fieldValues: Record<string, string>
}

export const sampleNote: Note = {
  id: "dZA8bN6wQMCfjwAAxwL72w" as NoteId,
  created: new Date(),
  modified: new Date(),
  templateId: "fanOeCfrTeGKVgAAek3FQg" as TemplateId,
  tags: new Set<string>(),
  fieldValues: {
    front: "Question",
    back: `Answer <img src="tree.jpg" >`,
  },
}
