import { type Plugin } from 'shared-dom'
import {
	type Plugin as PluginEntity,
	type Note as NoteEntity,
	type RemoteNote,
	type RemoteTemplate,
	type Template as TemplateEntity,
} from './database'
import {
	parseMap,
	type NoteId,
	type MediaId,
	type RemoteMediaNum,
	type RemoteTemplateId,
	type Note,
	type TemplateType,
	type TemplateId,
	type Template,
	imgPlaceholder,
	type Field,
	parseSet,
} from 'shared'
import { C } from '../topLevelAwait'

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
	const r: Template = {
		id: template.id as TemplateId,
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

export function noteEntityToDomain(
	note: NoteEntity & { templateFields: string },
	remotes: RemoteNote[],
): Note {
	const noteFVs = parseMap<string, string>(note.fieldValues)
	const tF = parseTemplateFields(note.templateFields).map((f) => f.name)
	const fieldValues = new Map(tF.map((f) => [f, noteFVs.get(f) ?? '']))
	noteFVs.forEach((v, f) => {
		if (!tF.includes(f)) {
			fieldValues.set(f, v)
		}
	})
	const r: Note = {
		id: note.id as NoteId,
		created: new Date(note.created),
		edited: new Date(note.edited),
		templateId: note.templateId,
		tags: parseTags(note.tags),
		fieldValues,
		ankiNoteId: note.ankiNoteId ?? undefined,
		remotes: new Map(
			remotes.map((r) => [
				r.nook,
				r.remoteId == null
					? null
					: { remoteNoteId: r.remoteId, uploadDate: new Date(r.uploadDate!) },
			]),
		),
	}
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
