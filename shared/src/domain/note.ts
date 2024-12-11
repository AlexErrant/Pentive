import {
	type NookId,
	type RemoteNoteId,
	type TemplateId,
	type NoteId,
} from '../brand'

export interface Note {
	id: NoteId
	templateId: TemplateId
	ankiNoteId?: number
	created: Date
	edited: Date
	tags: Set<string>
	fieldValues: Record<string, string>
	remotes: Record<NookId, NoteRemote>
}

export type NoteRemote = { remoteNoteId: RemoteNoteId; uploadDate: Date } | null
