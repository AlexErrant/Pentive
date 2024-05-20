// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import {
	type MediaId,
	type LDbId,
	type NookId,
	type Ord,
	type RemoteMediaNum,
	type PluginName,
	type PluginVersion,
} from 'shared'

export interface CardBase {
	id: LDbId
	ord: Ord
	noteId: LDbId
	tags: string
	created: number
	updated: number
	cardSettingId: LDbId | null
	due: number
	state: number | null
}

export interface Card extends CardBase {}

export interface Media {
	id: MediaId
	created: number
	updated: number
	data: Uint8Array
	hash: Uint8Array
}

export interface Note {
	id: LDbId
	templateId: LDbId
	ankiNoteId: number | null
	created: number
	updated: number
	tags: string
	fieldValues: string
}

export interface NoteField {
	rowid: number
	noteId: string
	field: string
}

export interface NoteFvFts {
	rowid: number
	field: string
	value: string
	normalizedField: string
	normalizedValue: string
}

export interface NoteFtsTag {
	rowid: number
	tags: string
}

export interface CardFtsTag {
	rowid: number
	tags: string
}

export interface RemoteNote {
	localId: LDbId
	nook: NookId
	remoteId: LDbId | null
	uploadDate: number | null
}

export interface TemplateNameFts {
	rowid: number
	name: string
}

export interface CardSettingNameFts {
	rowid: number
	name: string
}

export interface Plugin {
	name: PluginName
	version: PluginVersion
	dependencies: string | null
	created: number
	updated: number
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
	updated: number
	templateType: string
	ankiId: number | null
}

export interface RemoteTemplate {
	localId: LDbId
	nook: NookId
	remoteId: LDbId | null
	uploadDate: number | null
}

export interface NoteFtsTagVocab {
	term: string
	doc: number
	col: string
	offset: number
}

export interface CardFtsTagVocab {
	term: string
	doc: number
	col: string
	offset: number
}

export interface SqliteTempMaster {
	name: string
}

export interface Review {
	id: LDbId
	cardId: LDbId
	created: number
	rating: number
	kind: number
	details: string
}

export interface CardSetting {
	id: LDbId
	name: string
	details: string
}

export interface DB {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	sqlite_temp_master: SqliteTempMaster
	noteFtsTagVocab: NoteFtsTagVocab
	cardFtsTagVocab: CardFtsTagVocab
	cardSettingNameFts: CardSettingNameFts
	templateNameFts: TemplateNameFts
	card: Card
	cardBase: CardBase
	media: Media
	note: Note
	noteField: NoteField
	noteFvFts: NoteFvFts
	noteFtsTag: NoteFtsTag
	cardFtsTag: CardFtsTag
	remoteNote: RemoteNote
	plugin: Plugin
	remoteMedia: RemoteMedia
	template: Template
	remoteTemplate: RemoteTemplate
	review: Review
	cardSetting: CardSetting
}
