import {
	type RemoteMediaNum,
	type RemoteTemplateId,
	type TemplateType,
	type TemplateId,
	type MediaId,
	type Template,
	imgPlaceholder,
	type Field,
} from 'shared'
import {
	type RemoteTemplate,
	type Template as TemplateEntity,
} from './database'
import { toastImpossible } from '../components/toasts'

export const unitSeparator = '\x1f' // if this changes, also change noteFtsTag's separator 89CDE7EA-EF1B-4054-B381-597EE549CAB4

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
					toastImpossible(
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
	const r: Template = {
		id: template.id as TemplateId,
		name: template.name,
		created: new Date(template.created),
		updated: new Date(template.updated),
		fields: parseTemplateFields(template.fields),
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
