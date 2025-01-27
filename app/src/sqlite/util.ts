import { type Plugin } from 'shared-dom/plugin'
import {
	type Plugin as PluginEntity,
	type Note as NoteEntity,
	type RemoteNote,
	type RemoteTemplate,
	type Template as TemplateEntity,
	type DB,
} from './database'
import {
	type MediaId,
	fromLDbId,
	type NookId,
	type TemplateId,
	type RemoteTemplateId,
	type Base64,
	type RemoteMediaId,
	toLDbId,
	type NoteId,
	type RemoteNoteId,
} from 'shared/brand'
import { type Field, type Template } from 'shared/domain/template'
import { imgPlaceholder } from 'shared/image'
import { type TemplateType } from 'shared/schema'
import {
	parseSet,
	parseMap,
	notEmpty,
	type SqliteCount,
	type Rasterize,
} from 'shared/utility'
import { type Note } from 'shared/domain/note'
import { C, ky, tx } from '../topLevelAwait'
import { jsonArrayFrom } from 'kysely/helpers/sqlite'
import { sql, type AliasedRawBuilder, type ExpressionBuilder } from 'kysely'
import { arrayToBase64, base64ToArray } from 'shared/binary'
import { nullNook } from 'shared-edge'
import { parseHtml } from 'shared-dom/utility'

export function parseTags(rawTags: string) {
	return parseSet<string>(rawTags)
}

export async function remotifyDoms(rawDoms: string[]) {
	const docs = rawDoms.map(parseHtml)
	const imgSrcs = new Set(
		docs
			.flatMap((pd) => Array.from(pd.images))
			.map((i) => i.getAttribute('src'))
			.filter((i) => i !== '' && i != null),
	)
	const hashByLocal = new Map(
		await Promise.all(
			Array.from(imgSrcs.values())
				.filter(notEmpty)
				.map(async (src) => {
					const hash = await ky
						.selectFrom('media')
						.select('hash')
						.where('id', '=', src as MediaId)
						.executeTakeFirstOrThrow()
						.then((m) => arrayToBase64(m.hash))
					return [src as MediaId, hash] as const
				}),
		),
	)
	for (const doc of docs) {
		for (const image of doc.images) {
			const src = image.getAttribute('src') as MediaId
			if (src != null) {
				const hash =
					hashByLocal.get(src) ??
					C.toastImpossible(
						`${src} not found in ${JSON.stringify(Array.from(hashByLocal))}`,
					)
				const extension = src.substring(src.lastIndexOf('.'))
				image.setAttribute('src', `${imgPlaceholder}${hash}${extension}`)
			}
		}
	}
	return {
		docs,
		hashByLocal,
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
export async function updateRemotes(
	table: 'remoteNote' | 'remoteTemplate',
	isCreate: boolean,
	remoteIdByLocal: Map<
		readonly [NoteId, RemoteTemplateId] | readonly [TemplateId, NookId],
		readonly [RemoteNoteId | RemoteTemplateId, Array<[Base64, RemoteMediaId]>]
	>,
) {
	const now = C.getDate().getTime()
	await tx(async (db) => {
		for (const [
			[entityId, nOrT],
			[remoteId, hashAndRemoteMediaIds],
		] of remoteIdByLocal) {
			const entityDbId = toLDbId(entityId)
			const r = await db
				.updateTable(table)
				.$if(table === 'remoteTemplate' && nOrT !== nullNook, (eb) =>
					eb
						.set({ remoteId: toLDbId(remoteId), uploadDate: now })
						.where('nook', '=', nOrT as NookId),
				)
				.$if(table === 'remoteTemplate' && nOrT === nullNook, (eb) =>
					eb
						.set({ uploadDate: now }) //
						.where('remoteId', '=', toLDbId(remoteId)),
				)
				.$if(table === 'remoteNote', (eb) =>
					eb
						.set({
							remoteId: isCreate ? toLDbId(remoteId) : undefined,
							uploadDate: now,
						})
						.where(({ selectFrom, exists }) =>
							exists(
								selectFrom('remoteNote')
									.select(sql`1`.as('_'))
									.innerJoin('note', 'note.id', 'remoteNote.localId')
									.innerJoin(
										'remoteTemplate',
										'remoteTemplate.localId',
										'note.templateId',
									)
									.where(
										'remoteTemplate.remoteId',
										'=',
										toLDbId(nOrT as RemoteTemplateId),
									)
									.where('remoteNote.localId', '=', entityDbId),
							),
						),
				)
				.where('localId', '=', entityDbId)
				.returningAll()
				.execute()
			for (const [hash, remoteMediaId] of hashAndRemoteMediaIds) {
				await db
					.updateTable('remoteMedia')
					.set({ remoteMediaId })
					.from((eb) =>
						eb
							.selectFrom('media')
							.select('id')
							.where('hash', '=', base64ToArray(hash))
							.as('m'),
					)
					.where('localEntityId', '=', entityDbId)
					.whereRef('localMediaId', '=', 'm.id')
					.execute()
			}
			if (r.length !== 1)
				C.toastImpossible(
					`No ${table} found for ${table === 'remoteTemplate' ? 'nook' : 'RemoteTemplateId'} '${nOrT}' and ${table === 'remoteTemplate' ? 'templateId' : 'noteId'} ${entityId}'`,
				)
		}
	})
}

export async function uploadableNoteMedia<
	TId extends NoteId | undefined = undefined,
	TCount extends true | undefined = undefined,
>(
	torn: boolean,
	noteId: TId = undefined as TId,
	count: TCount = undefined as TCount,
) {
	const r = await ky
		.selectFrom('remoteMedia')
		.innerJoin('media', 'remoteMedia.localMediaId', 'media.id')
		.innerJoin('noteBase', 'remoteMedia.localEntityId', 'noteBase.id')
		.leftJoin('remoteNote', 'remoteNote.localId', 'noteBase.id')
		.$if(count === true, (qb) =>
			qb.select(
				ky.fn.count<SqliteCount>('remoteMedia.localEntityId').as('count'),
			),
		)
		.$if(count === undefined, (qb) =>
			qb.select([
				'remoteMedia.localMediaId',
				'media.data',
				'remoteMedia.localEntityId',
				'remoteMedia.remoteMediaId',
				'remoteNote.remoteId',
			]),
		)
		.$if(noteId != null, (qb) => qb.where('noteBase.id', '=', toLDbId(noteId!)))
		.$if(torn, (qb) => qb.where('remoteMedia.remoteMediaId', 'is not', null))
		.where(({ eb, or, ref }) =>
			or([
				eb('remoteMedia.uploadDate', 'is', null),
				eb('media.edited', '>', ref('remoteMedia.uploadDate')),
			]),
		)
		.execute()
	type SqlRow = (typeof r)[0]
	type R = TCount extends true
		? number
		: Array<Rasterize<Required<Omit<SqlRow, 'count'>>>>
	if (count) {
		return r[0]!.count as R
	}
	return r as R
}

export async function uploadableTemplateMedia<
	TId extends TemplateId | undefined = undefined,
	TCount extends true | undefined = undefined,
>(
	torn: boolean,
	templateId: TId = undefined as TId,
	count: TCount = undefined as TCount,
) {
	const r = await ky
		.selectFrom('remoteMedia')
		.innerJoin('media', 'remoteMedia.localMediaId', 'media.id')
		.innerJoin('template', 'remoteMedia.localEntityId', 'template.id')
		.leftJoin('remoteTemplate', 'remoteTemplate.localId', 'template.id')
		.$if(count === true, (qb) =>
			qb.select(
				ky.fn.count<SqliteCount>('remoteMedia.localEntityId').as('count'),
			),
		)
		.$if(count === undefined, (qb) =>
			qb.select([
				'remoteMedia.localMediaId',
				'media.data',
				'remoteMedia.localEntityId',
				'remoteMedia.remoteMediaId',
				'remoteTemplate.remoteId',
			]),
		)
		.$if(templateId != null, (qb) =>
			qb.where('template.id', '=', toLDbId(templateId!)),
		)
		.$if(torn, (qb) => qb.where('remoteMedia.remoteMediaId', 'is not', null))
		.where(({ eb, or, ref }) =>
			or([
				eb('remoteMedia.uploadDate', 'is', null),
				eb('media.edited', '>', ref('remoteMedia.uploadDate')),
			]),
		)
		.execute()
	type SqlRow = (typeof r)[0]
	type R = TCount extends true
		? number
		: Array<Rasterize<Required<Omit<SqlRow, 'count'>>>>
	if (count) {
		return r[0]!.count as R
	}
	return r as R
}

export async function getMediaToUpload<TType extends 'note' | 'template'>(
	type: TType,
	torn: boolean,
	entityId?: TType extends 'note' ? NoteId : TemplateId,
) {
	const mediaBinaries =
		type === 'note'
			? await uploadableNoteMedia(torn, entityId as NoteId)
			: await uploadableTemplateMedia(torn, entityId as TemplateId)
	const media = new Map<
		MediaId,
		{
			data: ArrayBuffer
			ids: Array<
				[
					TType extends 'note' ? NoteId : TemplateId,
					TType extends 'note' ? RemoteNoteId : RemoteTemplateId,
					RemoteMediaId,
				]
			>
		}
	>(
		mediaBinaries.map(({ localMediaId, data }) => [
			localMediaId,
			{ data, ids: [] },
		]),
	)
	for (const m of mediaBinaries) {
		const remoteId =
			m.remoteId ??
			C.toastImpossible(
				`${type} media '${m.localMediaId}' is missing a remoteId, is something wrong with the SQL query?`,
			)
		const value =
			media.get(m.localMediaId) ??
			C.toastImpossible(`mediaBinaries is missing '${m.localMediaId}'... how?`)
		const remoteMediaId =
			m.remoteMediaId ??
			C.toastImpossible(
				`remoteMedia with localMediaId '${m.localMediaId}' is missing remoteMediaId`, // this should've been set in the syncing step
			)
		value.ids.push([
			fromLDbId(m.localEntityId),
			fromLDbId(remoteId),
			remoteMediaId,
		])
	}
	return media
}
