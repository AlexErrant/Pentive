import {
	type NookId,
	type RemoteNoteId,
	type TemplateId,
	type NoteId,
} from '../brand.js'

export interface Note {
	id: NoteId
	templateId: TemplateId
	ankiNoteId?: number
	created: Date
	edited: Date
	tags: Set<string>
	fieldValues: Map<string, string>
	remotes: Map<NookId, { remoteNoteId: RemoteNoteId; uploadDate: Date } | null>
}
