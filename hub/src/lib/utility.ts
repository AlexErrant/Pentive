import {
	defaultRenderContainer as defaultRenderContainerOg,
	noteOrdsRenderContainer as noteOrdsRenderContainerOg,
} from 'shared-dom/renderContainer'
import { type Note } from 'shared/domain/note'
import { type Template } from 'shared/domain/template'
import { type RemoteTemplate, type RemoteNote } from 'shared/schema'
import ResizingIframe from '~/components/resizingIframe'

export function remoteToTemplate(remote: RemoteTemplate): Template {
	return {
		...remote,
		fields: remote.fields.map((name) => ({ name })),
		remotes: {
			[remote.nook]: { remoteTemplateId: remote.id, uploadDate: new Date() },
		},
	}
}

export function remoteToNote(remote: RemoteNote): Note {
	return {
		...remote,
		remotes: new Map([
			[remote.nook, { remoteNoteId: remote.id, uploadDate: new Date() }],
		]),
		tags: new Set(remote.tags),
	}
}

export const noteOrdsRenderContainer = noteOrdsRenderContainerOg({
	resizingIframe: ResizingIframe,
})

export const defaultRenderContainer = defaultRenderContainerOg({
	resizingIframe: ResizingIframe,
})
