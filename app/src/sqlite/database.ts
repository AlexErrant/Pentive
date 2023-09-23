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

export interface Card {
	id: LDbId
	ord: Ord
	noteId: LDbId
	deckIds: string
	created: number
	updated: number
	cardSettingId: LDbId | null
	due: number
	state: number | null
}

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

export interface NoteFtsFv {
	rowid: number
	fieldValues: string
}

export interface NoteFtsTag {
	rowid: number
	tags: string
}

export interface RemoteNote {
	localId: LDbId
	nook: NookId
	remoteId: LDbId | null
	uploadDate: number | null
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

export interface SqliteTempMaster {
	name: string
}

export interface Review {
	id: LDbId
	cardId: LDbId
	details: string
}

export interface CardSetting {
	id: LDbId
	details: string
}

export interface DB {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	sqlite_temp_master: SqliteTempMaster
	noteFtsTagVocab: NoteFtsTagVocab
	card: Card
	media: Media
	note: Note
	noteFtsFv: NoteFtsFv
	noteFtsTag: NoteFtsTag
	remoteNote: RemoteNote
	plugin: Plugin
	remoteMedia: RemoteMedia
	template: Template
	remoteTemplate: RemoteTemplate
	review: Review
	cardSetting: CardSetting
}
