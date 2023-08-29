import {
	type RemoteMediaNum,
	type RemoteTemplateId,
	type CreateRemoteTemplate,
	type EditRemoteTemplate,
	type NookId,
	type TemplateType,
	notEmpty,
	throwExp,
	undefinedMap,
	type TemplateId,
	type MediaId,
	type Field,
	type Template,
	objKeys,
	objEntries,
} from 'shared'
import { getKysely } from './crsqlite'
import {
	type DB,
	type RemoteTemplate,
	type Template as TemplateEntity,
} from './database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type InsertObject,
	type Kysely,
	type Transaction,
	type OnConflictTables,
	type RawBuilder,
} from 'kysely'
import { updateLocalMediaIdByRemoteMediaIdAndGetNewDoc } from './note'

function templateToDocType(template: Template) {
	const now = new Date().getTime()
	const insertTemplate: InsertObject<DB, 'template'> = {
		id: template.id,
		name: template.name,
		css: template.css,
		created: now,
		updated: now,
		fields: JSON.stringify(template.fields),
		templateType: JSON.stringify(template.templateType),
	}
	const remoteTemplates: RemoteTemplate[] = objEntries(template.remotes).map(
		([nook, remote]) => ({
			localId: template.id,
			nook,
			remoteId: remote?.remoteTemplateId ?? null,
			uploadDate: remote?.uploadDate.getTime() ?? null,
		}),
	)
	return { insertTemplate, remoteTemplates }
}

export const parseFields: (_: string) => Field[] = JSON.parse

export function entityToDomain(
	template: TemplateEntity,
	remotes: RemoteTemplate[],
) {
	const r: Template = {
		id: template.id as TemplateId,
		name: template.name,
		created: new Date(template.created),
		updated: new Date(template.updated),
		fields: parseFields(template.fields),
		css: template.css,
		templateType: JSON.parse(template.templateType) as TemplateType,
		remotes: Object.fromEntries(
			remotes.map((r) => {
				const value =
					r.remoteId == null || r.uploadDate == null
						? null
						: {
								remoteTemplateId: r.remoteId as RemoteTemplateId,
								uploadDate: new Date(r.uploadDate),
						  }
				return [r.nook, value]
			}),
		),
	}
	return r
}

function domainToCreateRemote(t: Template) {
	const r: CreateRemoteTemplate = {
		localId: t.id,
		name: t.name,
		css: t.css,
		nooks: objKeys(t.remotes),
		templateType: t.templateType,
		fields: t.fields.map((x) => x.name),
	}
	return r
}

function domainToEditRemote(template: Template) {
	const remoteIds = Object.entries(template.remotes)
		.map(([, v]) => v?.remoteTemplateId)
		.filter(notEmpty)
	if (remoteIds.length === 0)
		throwExp(`Zero remoteIds - is something wrong with the SQL query?`)
	const r: EditRemoteTemplate = {
		name: template.name,
		css: template.css,
		templateType: template.templateType,
		remoteIds,
		fields: template.fields.map((x) => x.name),
	}
	return r
}

export const templateCollectionMethods = {
	upsertTemplate: async function (template: Template, trx?: Transaction<DB>) {
		const { insertTemplate, remoteTemplates } = templateToDocType(template)
		const conflictValues = {
			...insertTemplate,
			id: undefined,
			created: undefined,
		}
		async function insert(trx: Transaction<DB>) {
			await trx
				.insertInto('template')
				.values(insertTemplate)
				.onConflict((db) => db.doUpdateSet(conflictValues))
				.execute()
			const oldRts = await trx
				.selectFrom('remoteTemplate')
				.selectAll()
				.where('localId', '=', template.id)
				.execute()
			// the following deleted/added/updated logic assumes ONE template
			const newRts = remoteTemplates
			const deleted = oldRts.filter(
				(o) => !newRts.some((n) => n.nook === o.nook),
			)
			const added = newRts.filter((o) => !oldRts.some((n) => n.nook === o.nook))
			const updated = newRts.filter((o) =>
				oldRts.some((n) => n.nook === o.nook),
			)
			if (deleted.length !== 0) {
				await trx
					.deleteFrom('remoteTemplate')
					.where('localId', '=', template.id)
					.where(
						'nook',
						'in',
						deleted.map((t) => t.nook),
					)
					.execute()
			}
			if (added.length !== 0) {
				await trx.insertInto('remoteTemplate').values(added).execute()
			}
			if (updated.length !== 0) {
				await trx
					.insertInto('remoteTemplate')
					.values(updated)
					.onConflict((db) =>
						db.doUpdateSet({
							uploadDate: (x) => x.ref('excluded.uploadDate'),
							remoteId: (x) => x.ref('excluded.remoteId'),
						} satisfies OnConflictUpdateRemoteTemplateSet),
					)
					.execute()
			}
		}
		if (trx == null) {
			await (await getKysely()).transaction().execute(insert)
		} else {
			await insert(trx)
		}
	},
	bulkInsertTemplate: async function (templates: Template[]) {
		const entities = templates.map(templateToDocType)
		const insertTemplates = entities.map((x) => x.insertTemplate)
		const remoteTemplates = entities.flatMap((x) => x.remoteTemplates)
		const db = await getKysely()
		await db.transaction().execute(async (tx) => {
			if (insertTemplates.length !== 0)
				await tx.insertInto('template').values(insertTemplates).execute()
			if (remoteTemplates.length !== 0)
				await tx.insertInto('remoteTemplate').values(remoteTemplates).execute()
		})
	},
	getTemplate: async function (templateId: TemplateId) {
		const db = await getKysely()
		const template = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.where('id', '=', templateId)
			.execute()
		return undefinedMap(template, toTemplate) ?? null
	},
	getTemplateIdByRemoteId: async function (
		templateId: RemoteTemplateId,
		db?: Kysely<DB>,
	) {
		db ??= await getKysely()
		const template = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.whereExists((qb) =>
				qb
					.selectFrom('remoteTemplate')
					.select('remoteTemplate.localId')
					.whereRef('template.id', '=', 'remoteTemplate.localId')
					.where('remoteTemplate.remoteId', '=', templateId),
			)
			.selectAll()
			.execute()
		return undefinedMap(template, toTemplate) ?? null
	},
	getTemplates: async function () {
		const db = await getKysely()
		const allTemplates = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.execute()
		return toTemplates(allTemplates)
	},
	// lowTODO actually use the offset/limit
	getTemplatesInfinitely: async function (offset: number, limit: number) {
		const db = await getKysely()
		const allTemplates = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.execute()
		const templates = toTemplates(allTemplates)
		const { count } = await db
			.selectFrom('template')
			.select(db.fn.count<number>('id').as('count'))
			.executeTakeFirstOrThrow()
		return { templates, count }
	},
	getNewTemplatesToUpload: async function () {
		const db = await getKysely()
		const dp = new DOMParser()
		const templatesAndStuff = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.where('remoteTemplate.remoteId', 'is', null)
			.where('remoteTemplate.nook', 'is not', null)
			.execute()
			.then((n) =>
				toTemplates(n)
					.map(domainToCreateRemote)
					.map((n) => withLocalMediaIdByRemoteMediaId(dp, n)),
			)
		return templatesAndStuff.map((n) => n.template)
	},
	getEditedTemplatesToUpload: async function () {
		const db = await getKysely()
		const dp = new DOMParser()
		const templatesAndStuff = await db
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.where('remoteId', 'is not', null)
			.whereRef('remoteTemplate.uploadDate', '<', 'template.updated')
			.selectAll()
			.execute()
			.then((n) =>
				toTemplates(n)
					.map(domainToEditRemote)
					.map((n) => withLocalMediaIdByRemoteMediaId(dp, n)),
			)
		return templatesAndStuff.map((n) => n.template)
	},
	getTemplateMediaToUpload: async function () {
		const db = await getKysely()
		const mediaBinaries = await db
			.selectFrom('remoteMedia')
			.innerJoin('media', 'remoteMedia.localMediaId', 'media.id')
			.innerJoin('template', 'remoteMedia.localEntityId', 'template.id')
			.leftJoin('remoteTemplate', 'remoteTemplate.localId', 'template.id')
			.select([
				'remoteMedia.localMediaId',
				'media.data',
				'remoteMedia.localEntityId',
				'remoteMedia.i',
				'remoteTemplate.remoteId',
			])
			.where('remoteMedia.uploadDate', 'is', null)
			.orWhereRef('media.updated', '>', 'remoteMedia.uploadDate')
			.execute()
		const media = new Map<
			MediaId,
			{
				data: ArrayBuffer
				ids: Array<[TemplateId, RemoteTemplateId, RemoteMediaNum]>
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
				throwExp(
					`Template media '${m.localMediaId}' is missing a remoteId, is something wrong with the SQL query?`,
				)
			const value =
				media.get(m.localMediaId) ??
				throwExp(`mediaBinaries is missing '${m.localMediaId}'... how?`)
			value.ids.push([m.localEntityId, remoteId, m.i])
		}
		return media
	},
	makeTemplateUploadable: async function (
		templateId: TemplateId,
		nook: NookId,
	) {
		const db = await getKysely()
		const remoteTemplate = {
			localId: templateId,
			nook,
			remoteId: null,
			uploadDate: null,
		}
		await db.transaction().execute(async (db) => {
			await db
				.insertInto('remoteTemplate')
				.values(remoteTemplate)
				.onConflict((db) => db.doNothing())
				.execute()
			const template = await db
				.selectFrom('template')
				.selectAll()
				.where('id', '=', templateId)
				.executeTakeFirstOrThrow()
			const { remoteMediaIdByLocal } = withLocalMediaIdByRemoteMediaId(
				new DOMParser(),
				domainToCreateRemote(toTemplate([{ ...template, ...remoteTemplate }])!),
			)
			const srcs = new Set(remoteMediaIdByLocal.keys())
			const mediaBinaries = await db
				.selectFrom('media')
				.select(['id', 'data'])
				.where('id', 'in', Array.from(srcs))
				.execute()
			if (mediaBinaries.length !== srcs.size)
				throwExp("You're missing a media.") // medTODO better error message
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', templateId)
				.where('i', '>', srcs.size as RemoteMediaNum)
				.execute()
			if (remoteMediaIdByLocal.size !== 0) {
				await db
					.insertInto('remoteMedia')
					.values(
						Array.from(remoteMediaIdByLocal).map(([localMediaId, i]) => ({
							localEntityId: templateId,
							i,
							localMediaId,
						})),
					)
					// insert into "remoteMedia" ("localEntityId", "i", "localMediaId") values (?, ?, ?)
					// on conflict do update set "localMediaId" = "excluded"."localMediaId"
					.onConflict((db) =>
						db.doUpdateSet({
							localMediaId: (x) => x.ref('excluded.localMediaId'),
						}),
					)
					.execute()
			}
		})
	},
	makeTemplateNotUploadable: async function (
		templateId: TemplateId,
		nook: NookId,
	) {
		const db = await getKysely()
		await db.transaction().execute(async (db) => {
			const r1 = await db
				.deleteFrom('remoteTemplate')
				.where('localId', '=', templateId)
				.where('nook', '=', nook)
				.returningAll()
				.execute()
			if (r1.length !== 1)
				console.warn(
					`No remoteTemplate found for nook '${nook}' and templateId '${templateId}'`,
				)
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', templateId)
				.execute()
		})
	},
	updateTemplateRemoteIds: async function (
		remoteIdByLocal: Map<readonly [TemplateId, NookId], RemoteTemplateId>,
	) {
		const db = await getKysely()
		for (const [[templateId, nook], remoteId] of remoteIdByLocal) {
			const r = await db
				.updateTable('remoteTemplate')
				.set({ remoteId, uploadDate: new Date().getTime() })
				.where('nook', '=', nook)
				.where('localId', '=', templateId)
				.returningAll()
				.execute()
			if (r.length !== 1)
				throwExp(
					`No remoteTemplate found for nook '${nook}' and templateId '${templateId}'`,
				)
		}
	},
	markTemplateAsPushed: async function (remoteTemplateIds: RemoteTemplateId[]) {
		const db = await getKysely()
		const r = await db
			.updateTable('remoteTemplate')
			.set({ uploadDate: new Date().getTime() })
			.where('remoteId', 'in', remoteTemplateIds)
			.returningAll()
			.execute()
		if (r.length !== remoteTemplateIds.length)
			throwExp(
				`Some remoteTemplates in ${JSON.stringify(
					remoteTemplateIds,
				)} not found. (This is the worst error message ever - medTODO.)`,
			)
	},
}

type Nullable<T> = { [K in keyof T]: T[K] | null }
type TemplateRow = Nullable<RemoteTemplate> & TemplateEntity

function toTemplates(allTemplates: TemplateRow[]) {
	const map = new Map<TemplateId, Template>()
	for (const row of allTemplates) {
		if (map.get(row.id) == null) {
			map.set(row.id, entityToDomain(row, []))
		}
		if (row.nook != null) {
			map.get(row.id)!.remotes[row.nook] =
				row.uploadDate == null
					? null
					: {
							remoteTemplateId: row.remoteId!,
							uploadDate: new Date(row.uploadDate),
					  }
		}
	}
	return Array.from(map.values())
}

function toTemplate(allTemplates: TemplateRow[]) {
	const r = toTemplates(allTemplates)
	return r.length === 0 ? null : r[0]
}

function withLocalMediaIdByRemoteMediaId<
	T extends CreateRemoteTemplate | EditRemoteTemplate,
>(dp: DOMParser, template: T) {
	const serializer = new XMLSerializer()
	const serialize = (doc: Document) => {
		const s = serializer.serializeToString(doc)
		return s.startsWith(
			`<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>`,
		)
			? doc.body.innerHTML
			: s
	}
	if (template.templateType.tag === 'standard') {
		const rawDoms = template.templateType.templates.flatMap((t) => [
			t.front,
			t.back,
		])
		const { docs, remoteMediaIdByLocal } =
			updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(dp, rawDoms)
		let i = 0
		for (const t of template.templateType.templates) {
			t.front = serialize(docs[i])
			i++
			t.back = serialize(docs[i])
			i++
		}
		return {
			template,
			remoteMediaIdByLocal,
		}
	} else {
		const { docs, remoteMediaIdByLocal } =
			updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(dp, [
				template.templateType.template.front,
				template.templateType.template.back,
			])
		template.templateType.template.front = serialize(docs[0])
		template.templateType.template.back = serialize(docs[1])
		return {
			template,
			remoteMediaIdByLocal,
		}
	}
}

// the point of this type is to cause an error if something is added to RemoteTemplate
type OnConflictUpdateRemoteTemplateSet = {
	[K in keyof RemoteTemplate as Exclude<K, 'nook' | 'localId'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'remoteTemplate'>,
			OnConflictTables<'remoteTemplate'>
		>,
	) => RawBuilder<RemoteTemplate[K]>
}
