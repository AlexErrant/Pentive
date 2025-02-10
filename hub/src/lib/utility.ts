import {
	defaultRenderContainer as defaultRenderContainerOg,
	noteOrdsRenderContainer as noteOrdsRenderContainerOg,
} from 'shared-dom/renderContainer'
import { cast } from 'shared/brand'
import type { Note } from 'shared/domain/note'
import type { Template } from 'shared/domain/template'
import type { RemoteTemplate, RemoteNote } from 'shared/schema'
import ResizingIframeDefault from '~/components/resizingIframe'

export function remoteToTemplate(remote: RemoteTemplate) {
	return {
		...remote,
		id: cast(remote.id),
		fields: remote.fields.map((name) => ({ name })),
		remotes: {
			[remote.nook]: { remoteTemplateId: remote.id, uploadDate: new Date() },
		},
	} satisfies Template
}

export function remoteToNote(remote: RemoteNote) {
	return {
		...remote,
		id: cast(remote.id),
		templateId: cast(remote.templateId),
		remotes: {
			[remote.nook]: { remoteNoteId: remote.id, uploadDate: new Date() },
		},
		tags: new Set(remote.tags),
	} satisfies Note
}

export const noteOrdsRenderContainer = noteOrdsRenderContainerOg({
	resizingIframe: ResizingIframeDefault,
})

export const defaultRenderContainer = defaultRenderContainerOg({
	resizingIframe: ResizingIframeDefault,
})
