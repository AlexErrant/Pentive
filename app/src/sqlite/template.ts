import {
	type DB,
	type RemoteTemplate,
	type Template as TemplateEntity,
} from './database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type InsertObject,
	type OnConflictTables,
} from 'kysely'
import {
	templateEntityToDomain,
	updateLocalMediaIdByRemoteMediaIdAndGetNewDoc,
} from './util'
import { tx, C, ky } from '../topLevelAwait'
import { type Template } from 'shared/domain/template'
import {
	type NookId,
	type TemplateId,
	type RemoteTemplateId,
	type MediaId,
	type RemoteMediaNum,
	fromLDbId,
	toLDbId,
} from 'shared/brand'
import {
	type CreateRemoteTemplate,
	type EditRemoteTemplate,
} from 'shared/schema'
import {
	objEntries,
	objKeys,
	notEmpty,
	undefinedMap,
	type SqliteCount,
} from 'shared/utility'

function templateToDocType(template: Template) {
	const now = C.getDate().getTime()
	const templateDbId = toLDbId(template.id)
	const insertTemplate = {
		id: templateDbId,
		name: template.name,
		css: template.css,
		created: now,
		edited: now,
		fields: JSON.stringify(template.fields),
		templateType: JSON.stringify(template.templateType),
	} satisfies InsertObject<DB, 'template'>
	const remoteTemplates = objEntries(template.remotes).map(
		([nook, remote]) =>
			({
				localId: templateDbId,
				nook,
				remoteId: toLDbId(remote?.remoteTemplateId ?? null),
				uploadDate: remote?.uploadDate.getTime() ?? null,
			}) satisfies RemoteTemplate,
	)
	return { insertTemplate, remoteTemplates }
}

function domainToCreateRemote(t: Template, nook?: NookId) {
	const nooks = nook == null ? objKeys(t.remotes) : [nook]
	const r: CreateRemoteTemplate = {
		localId: t.id,
		name: t.name,
		css: t.css,
		nooks,
		templateType: t.templateType,
		fields: t.fields.map((x) => x.name),
	}
	return r
}

function domainToEditRemote(template: Template, nook?: NookId) {
	const remoteIds = objEntries(template.remotes)
		.map(([k, v]) => {
			if (nook == null || k === nook) return v?.remoteTemplateId
			return null
		})
		.filter(notEmpty)
	if (remoteIds.length === 0)
		C.toastImpossible(`Zero remoteIds - is something wrong with the SQL query?`)
	return {
		name: template.name,
		css: template.css,
		templateType: template.templateType,
		remoteIds,
		fields: template.fields.map((x) => x.name),
	} satisfies EditRemoteTemplate
}

export const templateCollectionMethods = {
	upsertTemplate: async function (template: Template) {
		const templateDbId = toLDbId(template.id)
		await tx(async (tx) => {
			const { insertTemplate, remoteTemplates } = templateToDocType(template)
			await tx
				.insertInto('template')
				.values(insertTemplate)
				.onConflict((db) =>
					db.doUpdateSet({
						name: (x) => x.ref('excluded.name'),
						css: (x) => x.ref('excluded.css'),
						fields: (x) => x.ref('excluded.fields'),
						templateType: (x) => x.ref('excluded.templateType'),
						edited: (x) => x.ref('excluded.edited'),
						ankiId: (x) => x.ref('excluded.ankiId'),
					} satisfies OnConflictUpdateTemplateSet),
				)
				.execute()
			const oldRts = await tx
				.selectFrom('remoteTemplate')
				.selectAll()
				.where('localId', '=', templateDbId)
				.execute()
			// the following deleted/added/edited logic assumes ONE template
			const newRts = remoteTemplates
			const deleted = oldRts.filter(
				(o) => !newRts.some((n) => n.nook === o.nook),
			)
			const added = newRts.filter((o) => !oldRts.some((n) => n.nook === o.nook))
			const edited = newRts.filter((o) => oldRts.some((n) => n.nook === o.nook))
			if (deleted.length !== 0) {
				await tx
					.deleteFrom('remoteTemplate')
					.where('localId', '=', templateDbId)
					.where(
						'nook',
						'in',
						deleted.map((t) => t.nook),
					)
					.execute()
			}
			if (added.length !== 0) {
				await tx.insertInto('remoteTemplate').values(added).execute()
			}
			if (edited.length !== 0) {
				await tx
					.insertInto('remoteTemplate')
					.values(edited)
					.onConflict((db) =>
						db.doUpdateSet({
							uploadDate: (x) => x.ref('excluded.uploadDate'),
							remoteId: (x) => x.ref('excluded.remoteId'),
						} satisfies OnConflictUpdateRemoteTemplateSet),
					)
					.execute()
			}
		})
	},
	deleteTemplate: async function (templateId: TemplateId) {
		const templateDbId = toLDbId(templateId)
		await tx(async (tx) => {
			await tx.deleteFrom('template').where('id', '=', templateDbId).execute()
			await tx
				.deleteFrom('remoteTemplate')
				.where('localId', '=', templateDbId)
				.execute()
		})
	},
	bulkInsertTemplate: async function (templates: Template[]) {
		const entities = templates.map(templateToDocType)
		const insertTemplates = entities.map((x) => x.insertTemplate)
		const remoteTemplates = entities.flatMap((x) => x.remoteTemplates)
		await tx(async (tx) => {
			if (insertTemplates.length !== 0)
				await tx.insertInto('template').values(insertTemplates).execute()
			if (remoteTemplates.length !== 0)
				await tx.insertInto('remoteTemplate').values(remoteTemplates).execute()
		})
	},
	getTemplate: async function (templateId: TemplateId) {
		const templateDbId = toLDbId(templateId)
		const template = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.where('id', '=', templateDbId)
			.execute()
		return undefinedMap(template, toTemplate) ?? null
	},
	getTemplateIdByRemoteId: async function (templateId: RemoteTemplateId) {
		const template = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.where(({ selectFrom, exists }) =>
				exists(
					selectFrom('remoteTemplate')
						.select('remoteTemplate.localId')
						.whereRef('template.id', '=', 'remoteTemplate.localId')
						.where('remoteTemplate.remoteId', '=', toLDbId(templateId)),
				),
			)
			.selectAll()
			.execute()
		return undefinedMap(template, toTemplate) ?? null
	},
	getTemplates: async function () {
		const allTemplates = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.execute()
		return toTemplates(allTemplates)
	},
	// lowTODO actually use the offset/limit
	getTemplatesInfinitely: async function (offset: number, limit: number) {
		const allTemplates = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.execute()
		const templates = toTemplates(allTemplates)
		const { count } = await ky
			.selectFrom('template')
			.select(ky.fn.count<SqliteCount>('id').as('count'))
			.executeTakeFirstOrThrow()
		return { templates, count }
	},
	getNewTemplatesToUpload: async function (
		templateId?: TemplateId,
		nook?: NookId,
	) {
		const dp = new DOMParser()
		const templatesAndStuff = await this.getNewTemplatesToUploadDom(templateId)
		return templatesAndStuff
			.map((n) => domainToCreateRemote(n, nook))
			.map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
			.map((n) => n.template)
	},
	getNewTemplatesToUploadDom: async function (templateId?: TemplateId) {
		const templatesAndStuff = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.selectAll()
			.where('remoteTemplate.remoteId', 'is', null)
			.where('remoteTemplate.nook', 'is not', null)
			.$if(templateId != null, (db) =>
				db.where('template.id', '=', toLDbId(templateId!)),
			)
			.execute()
		return toTemplates(templatesAndStuff)
	},
	getEditedTemplatesToUpload: async function (
		templateId?: TemplateId,
		nook?: NookId,
	) {
		const dp = new DOMParser()
		const templatesAndStuff =
			await this.getEditedTemplatesToUploadDom(templateId)
		return templatesAndStuff
			.map((n) => domainToEditRemote(n, nook))
			.map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
			.map((n) => n.template)
	},
	getEditedTemplatesToUploadDom: async function (templateId?: TemplateId) {
		const templatesAndStuff = await ky
			.selectFrom('template')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.where('remoteId', 'is not', null)
			.whereRef('remoteTemplate.uploadDate', '<', 'template.edited')
			.$if(templateId != null, (db) =>
				db.where('template.id', '=', toLDbId(templateId!)),
			)
			.selectAll()
			.execute()
		return toTemplates(templatesAndStuff)
	},
	getTemplateMediaToUpload: async function (templateId?: TemplateId) {
		const mediaBinaries = await ky
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
			.where(({ eb, or, ref }) =>
				or([
					eb('remoteMedia.uploadDate', 'is', null),
					eb('media.edited', '>', ref('remoteMedia.uploadDate')),
				]),
			)
			.$if(templateId != null, (db) =>
				db.where('template.id', '=', toLDbId(templateId!)),
			)
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
				C.toastImpossible(
					`Template media '${m.localMediaId}' is missing a remoteId, is something wrong with the SQL query?`,
				)
			const value =
				media.get(m.localMediaId) ??
				C.toastImpossible(
					`mediaBinaries is missing '${m.localMediaId}'... how?`,
				)
			value.ids.push([fromLDbId(m.localEntityId), fromLDbId(remoteId), m.i])
		}
		return media
	},
	makeTemplateUploadable: async function (
		templateId: TemplateId,
		nook: NookId,
	) {
		const templateDbId = toLDbId(templateId)
		const remoteTemplate = {
			localId: templateDbId,
			nook,
			remoteId: null,
			uploadDate: null,
		} satisfies InsertObject<DB, 'remoteTemplate'>
		await tx(async (db) => {
			await db
				.insertInto('remoteTemplate')
				.values(remoteTemplate)
				.onConflict((db) => db.doNothing())
				.execute()
			const template = await db
				.selectFrom('template')
				.selectAll()
				.where('id', '=', templateDbId)
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
				C.toastFatal("You're missing a media.") // medTODO better error message
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', templateDbId)
				.where('i', '>', srcs.size as RemoteMediaNum)
				.execute()
			if (remoteMediaIdByLocal.size !== 0) {
				await db
					.insertInto('remoteMedia')
					.values(
						Array.from(remoteMediaIdByLocal).map(([localMediaId, i]) => ({
							localEntityId: templateDbId,
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
		const templateDbId = toLDbId(templateId)
		await tx(async (db) => {
			const r1 = await db
				.deleteFrom('remoteTemplate')
				.where('localId', '=', templateDbId)
				.where('nook', '=', nook)
				.returningAll()
				.execute()
			if (r1.length !== 1)
				C.toastWarn(
					`No remoteTemplate found for nook '${nook}' and templateId '${templateId}'`,
				)
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', templateDbId)
				.execute()
		})
	},
	updateTemplateRemoteIds: async function (
		remoteIdByLocal: Map<readonly [TemplateId, NookId], RemoteTemplateId>,
	) {
		const now = C.getDate().getTime()
		for (const [[templateId, nook], remoteId] of remoteIdByLocal) {
			const templateDbId = toLDbId(templateId)
			const r = await ky
				.updateTable('remoteTemplate')
				.set({ remoteId: toLDbId(remoteId), uploadDate: now })
				.where('nook', '=', nook)
				.where('localId', '=', templateDbId)
				.returningAll()
				.execute()
			if (r.length !== 1)
				C.toastFatal(
					`No remoteTemplate found for nook '${nook}' and templateId '${templateId}'`,
				)
		}
	},
	markTemplateAsPushed: async function (remoteTemplateIds: RemoteTemplateId[]) {
		const r = await ky
			.updateTable('remoteTemplate')
			.set({ uploadDate: C.getDate().getTime() })
			.where('remoteId', 'in', remoteTemplateIds.map(toLDbId))
			.returningAll()
			.execute()
		if (r.length !== remoteTemplateIds.length)
			C.toastFatal(
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
		const id = fromLDbId<TemplateId>(row.id)
		if (map.get(id) == null) {
			map.set(id, templateEntityToDomain(row, []))
		}
		if (row.nook != null) {
			map.get(id)!.remotes[row.nook] =
				row.uploadDate == null
					? null
					: {
							remoteTemplateId: fromLDbId(row.remoteId),
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
			t.front = serialize(docs[i]!)
			i++
			t.back = serialize(docs[i]!)
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
		template.templateType.template.front = serialize(docs[0]!)
		template.templateType.template.back = serialize(docs[1]!)
		return {
			template,
			remoteMediaIdByLocal,
		}
	}
}

// The point of this type is to cause an error if something is added to RemoteTemplate
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateRemoteTemplateSet = {
	[K in keyof RemoteTemplate as Exclude<K, 'nook' | 'localId'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'remoteTemplate'>,
			OnConflictTables<'remoteTemplate'>
		>,
	) => unknown
}

// The point of this type is to cause an error if something is added to Template
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateTemplateSet = {
	[K in keyof TemplateEntity as Exclude<K, 'id' | 'created'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'template'>,
			OnConflictTables<'template'>
		>,
	) => unknown
}
