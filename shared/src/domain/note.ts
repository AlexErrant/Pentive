import type {
	NookId,
	RemoteNoteId,
	TemplateId,
	NoteId,
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

export type NoteRemote =
	| undefined // "not uploadable"
	| null // "marked for upload, but not yet uploaded"
	| { remoteNoteId: RemoteNoteId; uploadDate: Date }
