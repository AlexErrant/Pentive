import { TemplateId, RemoteCardId, RemoteTemplateId, NoteId } from "./ids"

export interface Note {
  readonly id: NoteId
  readonly templateId: TemplateId
  readonly pushId?: RemoteCardId
  readonly pushTemplateId?: RemoteTemplateId
  readonly push?: true
  readonly ankiNoteId?: number
  readonly created: Date
  readonly modified: Date
  readonly tags: ReadonlySet<string>
  readonly fieldValues: Record<string, string>
}

export const sampleNote: Note = {
  id: "305B7B2E-8591-4B4C-8775-3038E0AA34A4" as NoteId,
  created: new Date(),
  modified: new Date(),
  templateId: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
  tags: new Set<string>(),
  fieldValues: {
    front: "foo",
    back: "bar",
  },
}
