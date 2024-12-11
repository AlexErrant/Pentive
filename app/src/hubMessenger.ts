import * as Comlink from 'comlink'
import { ulidAsBase64Url } from './domain/utility'
import { noteOrds } from 'shared-dom/cardHtml'
import { C, tx } from './topLevelAwait'
import {
	type ChildTemplate,
	type RemoteNote,
	type RemoteTemplate,
} from 'shared/schema'
import { type NookId, type CardId, type MediaId, cast } from 'shared/brand'
import { relativeChar } from 'shared/image'
import { type Template } from 'shared/domain/template'
import { type Note } from 'shared/domain/note'
import { type Card } from 'shared/domain/card'
import { objEntries } from 'shared/utility'

export const appExpose = {
	addTemplate: async (rt: RemoteTemplate) => {
		const serializer = new XMLSerializer()
		const now = C.getDate()
		await tx(async () => {
			const template = {
				id: cast(rt.id),
				name: rt.name,
				css: rt.css,
				created: now,
				edited: now,
				templateType: rt.templateType,
				fields: rt.fields.map((name) => ({ name })),
				remotes: {
					[rt.nook]: { remoteTemplateId: rt.id, uploadDate: now },
				},
			} satisfies Template
			const dp = new DOMParser()
			if (template.templateType.tag === 'standard') {
				await Promise.all(
					template.templateType.templates.map(async (t) => {
						const { imgSrcs, front, back } = getTemplateImages(t, dp)
						t.front = serializer.serializeToString(front)
						t.back = serializer.serializeToString(back)
						return await downloadImages(imgSrcs)
					}),
				)
			} else {
				const { imgSrcs, front, back } = getTemplateImages(
					template.templateType.template,
					dp,
				)
				await downloadImages(imgSrcs)
				template.templateType.template.front =
					serializer.serializeToString(front)
				template.templateType.template.back = serializer.serializeToString(back)
			}
			await C.db.upsertTemplate(template)
		})
	},
	addNote: async (rn: RemoteNote, nook: NookId) => {
		const now = C.getDate()
		await tx(async () => {
			const template =
				(await C.db.getTemplateIdByRemoteId(rn.templateId)) ??
				C.toastFatal(`You don't have the remote template ${rn.templateId}`)
			const n = {
				id: cast(rn.id),
				templateId: template.id,
				// ankiNoteId: rn.ankiNoteId,
				created: rn.created,
				edited: rn.edited,
				tags: new Set(rn.tags),
				fieldValues: rn.fieldValues,
				remotes: Object.fromEntries([
					[nook, { remoteNoteId: rn.id, uploadDate: now }],
				]),
			} satisfies Note
			await downloadImages(getNoteImages(n.fieldValues, new DOMParser()))
			await C.db.upsertNote(n)
			const ords = noteOrds.bind(C)(n, template)
			const cards = ords.map((i) => {
				const card: Card = {
					id: ulidAsBase64Url() as CardId,
					ord: i,
					noteId: n.id,
					tags: new Set(),
					created: now,
					edited: now,
					lapses: 0,
					repCount: 0,
					due: now,
				}
				return card
			})
			await C.db.bulkUpsertCards(cards)
		})
	},
}

// highTODO needs security on the origin
Comlink.expose(appExpose, Comlink.windowEndpoint(self.parent))

function getNoteImages(fieldValues: Record<string, string>, dp: DOMParser) {
	const imgSrcs = new Map<MediaId, string>()
	for (const [f, v] of objEntries(fieldValues)) {
		const doc = dp.parseFromString(v, 'text/html')
		Array.from(doc.images).forEach((i) => {
			mutate(i, imgSrcs)
		})
		fieldValues[f] = doc.body.innerHTML
	}
	return imgSrcs
}

function mutate(img: HTMLImageElement, imgSrcs: Map<MediaId, string>) {
	const src = img.getAttribute('src')
	if (src == null || src === '') {
		// do nothing
	} else if (src.startsWith(relativeChar)) {
		const id = src.slice(1) as MediaId
		imgSrcs.set(id, import.meta.env.VITE_AUGC_URL + 'i' + src)
		img.setAttribute('src', id)
	} else {
		// not sure that this branch should ever be hit
		const id = ulidAsBase64Url() as string as MediaId
		imgSrcs.set(id, img.src)
		img.setAttribute('src', id)
	}
}

function getTemplateImages(ct: ChildTemplate, dp: DOMParser) {
	const imgSrcs = new Map<MediaId, string>()
	const front = dp.parseFromString(ct.front, 'text/html')
	const back = dp.parseFromString(ct.back, 'text/html')
	Array.from(front.images).forEach((i) => {
		mutate(i, imgSrcs)
	})
	Array.from(back.images).forEach((i) => {
		mutate(i, imgSrcs)
	})
	return { imgSrcs, front, back }
}

// VERYlowTODO could sent it over Comlink - though that'll be annoying because it's in hub-ugc
async function downloadImages(imgSrcs: Map<MediaId, string>) {
	return await Promise.all(
		Array.from(imgSrcs).map(async ([id, imgSrc]) => {
			const response = await fetch(imgSrc)
			if (response.status === 200) {
				const now = C.getDate()
				await C.db.insertMedia({
					id,
					created: now,
					edited: now,
					data: await response.arrayBuffer(),
				})
			} else {
				return C.toastFatal(
					`Error occurred while downloading ${imgSrc}.`,
					`Fetching ${imgSrc} got a status code of ${response.status}`,
					response,
				)
			}
		}),
	)
}
