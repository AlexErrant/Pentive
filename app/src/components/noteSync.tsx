import {
	type VoidComponent,
	For,
	Show,
	createResource,
	Switch,
	Match,
} from 'solid-js'
import { type RemoteNoteId } from 'shared'
import { augcClient } from '../trpcClient'
import DiffHtml from './diffHtml'
import ResizingIframe from './resizingIframe'
import { type NoteCardView } from '../uiLogic/cards'
import { html } from '@codemirror/lang-html'
import { DiffModeToggleGroup } from './diffModeContext'

const NoteSync: VoidComponent<{ note: NoteCardView }> = (props) => (
	<ul>
		<For each={Array.from(props.note.note.remotes)}>
			{([nookId, remoteNote]) => (
				<li>
					<h2>/n/{nookId}</h2>
					<Show when={remoteNote} fallback={`Not yet uploaded.`}>
						<NoteNookSync note={props.note} remoteNote={remoteNote!} />
					</Show>
				</li>
			)}
		</For>
	</ul>
)

export default NoteSync

const NoteNookSync: VoidComponent<{
	note: NoteCardView
	remoteNote: {
		remoteNoteId: RemoteNoteId
		uploadDate: Date
	}
}> = (props) => {
	const [remoteNote] = createResource(
		() => props.remoteNote.remoteNoteId,
		async (id) => await augcClient.getNote.query(id), // medTODO planetscale needs an id that associates all notes so we can lookup in 1 pass. Also would be useful to find "related" notes
	)
	return (
		<Show when={remoteNote()}>
			<DiffModeToggleGroup />
			<ul>
				<For
					each={Array.from(
						(() => {
							const m = new Map<
								string,
								[string | undefined, string | undefined]
							>()
							for (const [field, value] of props.note.note.fieldValues) {
								m.set(field, [value, undefined])
							}
							for (const [field, value] of remoteNote()!.fieldValues) {
								m.set(field, [m.get(field)?.at(0), value])
							}
							return m
						})(),
					)}
				>
					{([field, [local, remote]]) => (
						<li>
							<Switch
								fallback={
									<DiffHtml
										extensions={[html()]}
										before={remote!}
										after={local!}
										css={props.note.template.css}
										title={field}
									/>
								}
							>
								<Match when={local == null}>
									<h2>Deleted</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: remote!,
											css: props.note.template.css,
										}}
									/>
								</Match>
								<Match when={remote == null}>
									<h2>Added</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: local!,
											css: props.note.template.css,
										}}
									/>
								</Match>
							</Switch>
						</li>
					)}
				</For>
			</ul>
		</Show>
	)
}
