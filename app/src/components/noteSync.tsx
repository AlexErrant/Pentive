import {
	type VoidComponent,
	createResource,
	Switch,
	Match,
	Suspense,
} from 'solid-js'
import { type RemoteMediaId, type NookId } from 'shared/brand'
import { augcClient } from '../trpcClient'
import DiffHtml from './diffHtml'
import ResizingIframe from './resizingIframe'
import { html } from '@codemirror/lang-html'
import { DiffModeToggleGroup } from './diffModeContext'
import { objEntries } from 'shared/utility'
import { Entries } from '@solid-primitives/keyed'
import { type Template } from 'shared/domain/template'
import { type NoteRemote, type Note } from 'shared/domain/note'
import { UploadEntry } from './uploadEntry'
import { uploadNotes } from '../domain/sync'
import { C } from '../topLevelAwait'
import { parseHtml } from 'shared-dom/utility'

const NoteSync: VoidComponent<{ template: Template; note: Note }> = (props) => (
	<>
		<DiffModeToggleGroup />
		<ul>
			<Entries of={props.note.remotes}>
				{(nookId, remoteNote) => (
					<li>
						<h2>/n/{nookId}</h2>
						<NoteNookSync
							template={props.template}
							note={props.note}
							remoteNote={remoteNote()}
						/>
					</li>
				)}
			</Entries>
		</ul>
	</>
)

export default NoteSync

export const NoteNookSync: VoidComponent<{
	note: Note
	template: Template
	nook?: NookId
	remoteNote: NoteRemote
}> = (props) => {
	return (
		<UploadEntry
			remote={props.remoteNote}
			// eslint-disable-next-line solid/reactivity
			upload={async () => {
				await uploadNotes(false, props.note.id, props.nook)
			}}
		>
			<NoteNookSyncActual
				note={props.note}
				template={props.template}
				remoteNote={props.remoteNote}
			/>
		</UploadEntry>
	)
}

const NoteNookSyncActual: VoidComponent<{
	note: Note
	template: Template
	remoteNote: NoteRemote
}> = (props) => {
	const [remoteNote] = createResource(
		() => props.remoteNote?.remoteNoteId,
		async (id) => await augcClient.getNote.query(id), // medTODO planetscale needs an id that associates all notes so we can lookup in 1 pass. Also would be useful to find "related" notes
	)
	const [mergedFieldValues] = createResource(
		() => [props.note, remoteNote()] as const,
		async ([note, remoteNote]) => {
			const m: Record<string, [string | undefined, string | undefined]> = {}
			for (const [field, value] of objEntries(note.fieldValues)) {
				m[field] = [value, undefined]
			}
			if (remoteNote != null) {
				for (const [field, value] of objEntries(remoteNote.fieldValues)) {
					const doc = parseHtml(value)
					await Promise.all(
						Array.from(doc.images).map(async (imgEl) => {
							const rmId = imgEl
								.getAttribute('src')!
								.substring(0, 43) as RemoteMediaId
							const mediaId = await C.db.getLocalMediaId(rmId)
							if (mediaId == null) {
								C.toastWarn(`Unable to find the remoteMediaId for ${rmId}`)
							} else {
								imgEl.setAttribute('src', mediaId.localMediaId)
							}
						}),
					)
					m[field] = [m[field]?.at(0), doc.body.innerHTML]
				}
			}
			return m
		},
	)
	return (
		<Suspense fallback={'Loading...'}>
			<ul>
				<Entries of={mergedFieldValues()}>
					{(field, localRemote) => (
						<li>
							<Switch
								fallback={
									<DiffHtml
										extensions={[html()]}
										before={localRemote()[1]}
										after={localRemote()[0]}
										css={props.template.css}
										title={field}
									/>
								}
							>
								<Match when={localRemote()[0] == null}>
									<h2>Deleted</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: localRemote()[1]!,
											css: props.template.css,
										}}
									/>
								</Match>
								<Match when={localRemote()[1] == null}>
									<h2>Added</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: localRemote()[0]!,
											css: props.template.css,
										}}
									/>
								</Match>
							</Switch>
						</li>
					)}
				</Entries>
			</ul>
		</Suspense>
	)
}
