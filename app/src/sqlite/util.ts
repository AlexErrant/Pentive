import { type Plugin } from 'shared-dom/plugin'
import {
	type Plugin as PluginEntity,
	type Note as NoteEntity,
	type RemoteNote,
	type RemoteTemplate,
	type Template as TemplateEntity,
	type DB,
	type SettingBase,
} from './database'
import {
	type MediaId,
	type RemoteMediaNum,
	fromLDbId,
	type NookId,
} from 'shared/brand'
import { type Field, type Template } from 'shared/domain/template'
import { imgPlaceholder } from 'shared/image'
import { type TemplateType } from 'shared/schema'
import { parseSet, parseMap, objEntries } from 'shared/utility'
import { type Note } from 'shared/domain/note'
import { C } from '../topLevelAwait'
import { jsonArrayFrom } from 'kysely/helpers/sqlite'
import { type AliasedRawBuilder, type ExpressionBuilder } from 'kysely'
import { type SettingValue, type Setting } from 'shared/domain/setting'

export function parseTags(rawTags: string) {
	return parseSet<string>(rawTags)
}

export function updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
	dp: DOMParser,
	rawDoms: string[],
) {
	const docs = rawDoms.map((rawDom) => dp.parseFromString(rawDom, 'text/html'))
	const imgSrcs = new Set(
		docs
			.flatMap((pd) => Array.from(pd.images))
			.map((i) => i.getAttribute('src'))
			.filter((i) => i !== '' && i != null),
	)
	const remoteMediaIdByLocal = new Map(
		Array.from(imgSrcs.values()).map(
			(src, i) => [src as MediaId, i as RemoteMediaNum] as const,
		),
	)
	for (const doc of docs) {
		for (const image of doc.images) {
			const src = image.getAttribute('src') as MediaId
			if (src != null) {
				const i =
					remoteMediaIdByLocal.get(src) ??
					C.toastImpossible(
						`${src} not found in ${JSON.stringify(
							Array.from(remoteMediaIdByLocal),
						)}`,
					)
				const extension = src.substring(src.lastIndexOf('.'))
				image.setAttribute('src', `${imgPlaceholder}${i}${extension}`)
			}
		}
	}
	return {
		docs,
		remoteMediaIdByLocal,
	}
}

export const parseTemplateFields: (_: string) => Field[] = JSON.parse

export function templateEntityToDomain(
	template: TemplateEntity,
	remotes: RemoteTemplate[],
) {
	return {
		id: fromLDbId(template.id),
		name: template.name,
		created: new Date(template.created),
		edited: new Date(template.edited),
		fields: parseTemplateFields(template.fields),
		css: template.css,
		templateType: JSON.parse(template.templateType) as TemplateType,
		remotes: Object.fromEntries(
			remotes.map((r) => {
				const value =
					r.remoteId == null || r.uploadDate == null
						? null
						: ({
								remoteTemplateId: fromLDbId(r.remoteId),
								uploadDate: new Date(r.uploadDate),
							} satisfies Template['remotes'][NookId])
				return [r.nook, value]
			}),
		),
	} satisfies Template
}

export function noteEntityToDomain(
	// eslint-disable-next-line @typescript-eslint/naming-convention
	note: NoteEntity & { template_fields: string },
	remotes: RemoteNote[],
): Note {
	const noteFVs = parseMap<string, string>(note.fieldValues)
	const tF = parseTemplateFields(note.template_fields).map((f) => f.name)
	const fieldValues = Object.fromEntries(
		tF.map((f) => [f, noteFVs.get(f) ?? '']),
	)
	noteFVs.forEach((v, f) => {
		if (!tF.includes(f)) {
			fieldValues[f] = v
		}
	})
	const r = {
		id: fromLDbId(note.id),
		created: new Date(note.created),
		edited: new Date(note.edited),
		templateId: fromLDbId(note.templateId),
		tags: parseTags(note.tags),
		fieldValues,
		ankiNoteId: note.ankiNoteId ?? undefined,
		remotes: Object.fromEntries(
			remotes.map((r) => [
				r.nook,
				r.remoteId == null
					? null
					: ({
							remoteNoteId: fromLDbId(r.remoteId),
							uploadDate: new Date(r.uploadDate!),
						} satisfies Note['remotes'][NookId]),
			]),
		),
	} satisfies Note
	if (r.ankiNoteId === undefined) {
		delete r.ankiNoteId
	}
	return r
}

export function pluginEntityToDomain(entity: PluginEntity): Plugin {
	return {
		name: entity.name,
		version: entity.version,
		dependencies: entity.dependencies ?? undefined,
		created: new Date(entity.created),
		edited: new Date(entity.edited),
		script: new Blob([entity.script], {
			type: 'text/javascript',
		}),
	}
}

// I don't want to use ParseJSONResultsPlugin because it parses all columns unconditionally. I parse manually instead.
// @ts-expect-error This means that at runtime we get a string, but Typescript thinks it's a T. Fixed by a parse and cast.
export const forceParse: <T>(text: T) => T = JSON.parse

type RemoteTemplateSubset = Omit<RemoteTemplate, 'localId'>

type RemoteTemplateJsonArray = AliasedRawBuilder<
	RemoteTemplateSubset[],
	'remoteTemplate'
>

export function templateSelection(
	eb: ExpressionBuilder<DB, 'note' | 'card' | 'template'>,
) {
	return [
		'template.ankiId as template_ankiId',
		'template.created as template_created',
		'template.css as template_css',
		'template.fields as template_fields',
		'template.id as template_id',
		'template.edited as template_edited',
		'template.name as template_name',
		'template.templateType as template_templateType',

		jsonArrayFrom(
			eb
				.selectFrom('remoteTemplate')
				.select(['uploadDate', 'nook', 'remoteId'])
				.whereRef('note.templateId', '=', 'remoteTemplate.localId'),
		).as(
			'remoteTemplate',
		) satisfies RemoteTemplateJsonArray as RemoteTemplateJsonArray,
	] as const
}

type TemplatePrefix<T> = {
	[P in keyof T as `template_${string & P}`]: T[P]
}

export function getTemplate(
	entity: TemplatePrefix<TemplateEntity> & {
		remoteTemplate: RemoteTemplateSubset[]
	},
) {
	return templateEntityToDomain(
		{
			ankiId: entity.template_ankiId,
			created: entity.template_created,
			css: entity.template_css,
			fields: entity.template_fields,
			id: entity.template_id,
			edited: entity.template_edited,
			name: entity.template_name,
			templateType: entity.template_templateType,
		},
		forceParse(entity.remoteTemplate).map((rt) => ({
			nook: rt.nook,
			localId: entity.template_id,
			remoteId: rt.remoteId,
			uploadDate: rt.uploadDate,
		})),
	)
}

// medTODO property test
const encoder = new TextEncoder() // always utf-8
const decoder = new TextDecoder('utf-8')
export function encodeValue(rawValue: SettingValue) {
	return Array.isArray(rawValue) || typeof rawValue === 'boolean'
		? encoder.encode(JSON.stringify(rawValue))
		: rawValue
}
function decodeValue(value: Uint8Array) {
	return JSON.parse(decoder.decode(value)) as SettingValue
}

interface JSONObject {
	[key: string]: SettingValue | JSONObject
}

const delimiter = '/'

export function flattenObject(obj: JSONObject, parentKey: string = '') {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	const result = {} as Setting
	for (const [key, value] of objEntries(obj)) {
		const newKey = parentKey === '' ? key : `${parentKey}${delimiter}${key}`
		if (typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(result, flattenObject(value, newKey))
		} else {
			result[newKey] = value
		}
	}
	return result
}

export function unflattenObject(
	flattened: Array<readonly [string, SettingBase['value']]>,
) {
	const result: JSONObject = {}
	for (const [key, value] of flattened) {
		const keys = key.split(delimiter)
		let currentLevel: JSONObject = result
		for (let i = 0; i < keys.length; i++) {
			const segment = keys[i]!
			if (/* "is last" */ i === keys.length - 1) {
				if (ArrayBuffer.isView(value)) {
					currentLevel[segment] = decodeValue(value)
				} else {
					currentLevel[segment] = value
				}
			} else {
				currentLevel = (currentLevel[segment] as JSONObject) ??= {}
			}
		}
	}
	return result
}
