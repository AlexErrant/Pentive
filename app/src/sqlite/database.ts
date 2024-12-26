// most of these columns are nullable in SQLite, but they're not nullable here for the sake of my sanity

import {
	type MediaId,
	type LDbId,
	type NookId,
	type Ord,
	type RemoteMediaNum,
	type PluginName,
	type PluginVersion,
} from 'shared/brand'

export interface CardBase {
	id: LDbId
	ord: Ord
	noteId: LDbId
	created: number
	edited: number
	lapses: number
	repCount: number
	cardSettingId: LDbId | null
	due: number
	state: number | null
}

export interface Card extends CardBase {
	tags: string
}

export interface CardWithTagCount extends Card {
	tagCount: number
}

export interface NoteTag {
	tag: string
	noteId: LDbId
}

export interface CardTag {
	tag: string
	cardId: LDbId
}

export interface Media {
	id: MediaId
	created: number
	edited: number
	data: Uint8Array
	hash: Uint8Array
}

export interface NoteBase {
	id: LDbId
	templateId: LDbId
	ankiNoteId: number | null
	created: number
	edited: number
}

export interface Note extends NoteBase {
	tags: string
	fieldValues: string
}

export interface NoteWithTagCount extends Note {
	tagCount: number
}

export interface NoteFieldValue {
	noteId: string
	field: string
	value: string
}

export interface NoteFieldFts {
	rowid: number
	field: string
	normalized: string
}

export interface NoteValueFts {
	rowid: number
	value: string
	normalized: string
	rank: number
}

export interface NoteTagFts {
	rowid: number
	tag: string
}

export interface CardTagFts {
	rowid: number
	tag: string
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
	edited: number
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
	edited: number
	templateType: string
	ankiId: number | null
}

export interface RemoteTemplate {
	localId: LDbId
	nook: NookId
	remoteId: LDbId | null
	uploadDate: number | null
}

export interface DistinctNoteField {
	field: string
	normalized: string
}

export interface DistinctNoteTag {
	tag: string
}
export interface DistinctCardTag {
	tag: string
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

export interface Setting {
	id: LDbId
	key: string
	value: string | number | Uint8Array
}

export interface DB {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	sqlite_temp_master: SqliteTempMaster
	distinctCardTag: DistinctCardTag
	distinctNoteTag: DistinctNoteTag
	distinctNoteField: DistinctNoteField
	cardTag: CardTag
	noteTag: NoteTag
	cardSettingNameFts: CardSettingNameFts
	templateNameFts: TemplateNameFts
	card: Card
	cardWithTagCount: CardWithTagCount
	cardBase: CardBase
	media: Media
	note: Note
	noteWithTagCount: NoteWithTagCount
	noteBase: NoteBase
	noteFieldValue: NoteFieldValue
	noteFieldFts: NoteFieldFts
	noteValueFts: NoteValueFts
	noteTagFts: NoteTagFts
	cardTagFts: CardTagFts
	remoteNote: RemoteNote
	plugin: Plugin
	remoteMedia: RemoteMedia
	template: Template
	remoteTemplate: RemoteTemplate
	review: Review
	setting: Setting
}
