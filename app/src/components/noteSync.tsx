import {
	type VoidComponent,
	Show,
	createResource,
	Switch,
	Match,
} from 'solid-js'
import { type RemoteNoteId } from 'shared/brand'
import { augcClient } from '../trpcClient'
import DiffHtml from './diffHtml'
import ResizingIframe from './resizingIframe'
import { type NoteCardView } from '../uiLogic/cards'
import { html } from '@codemirror/lang-html'
import { DiffModeToggleGroup } from './diffModeContext'
import { objEntries } from 'shared/utility'
import { Entries } from '@solid-primitives/keyed'

const NoteSync: VoidComponent<{ note: NoteCardView }> = (props) => (
	<ul>
		<Entries of={props.note.note.remotes}>
			{(nookId, remoteNote) => (
				<li>
					<h2>/n/{nookId}</h2>
					<Show when={remoteNote()} fallback={`Not yet uploaded.`}>
						<NoteNookSync note={props.note} remoteNote={remoteNote()!} />
					</Show>
				</li>
			)}
		</Entries>
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
	const mergedFieldValues = () => {
		if (remoteNote() == null) return null
		const m: Record<string, [string | undefined, string | undefined]> = {}
		for (const [field, value] of objEntries(props.note.note.fieldValues)) {
			m[field] = [value, undefined]
		}
		for (const [field, value] of objEntries(remoteNote()!.fieldValues)) {
			m[field] = [m[field]?.at(0), value]
		}
		return m
	}
	return (
		<Show when={remoteNote()}>
			<DiffModeToggleGroup />
			<ul>
				<Entries of={mergedFieldValues()}>
					{(field, localRemote) => (
						<li>
							<Switch
								fallback={
									<DiffHtml
										extensions={[html()]}
										before={localRemote()[1]!}
										after={localRemote()[0]!}
										css={props.note.template.css}
										title={field}
									/>
								}
							>
								<Match when={localRemote()[0]! == null}>
									<h2>Deleted</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: localRemote()[1]!,
											css: props.note.template.css,
										}}
									/>
								</Match>
								<Match when={localRemote()[1]! == null}>
									<h2>Added</h2>
									<ResizingIframe
										i={{
											tag: 'raw',
											html: localRemote()[0]!,
											css: props.note.template.css,
										}}
									/>
								</Match>
							</Switch>
						</li>
					)}
				</Entries>
			</ul>
		</Show>
	)
}
