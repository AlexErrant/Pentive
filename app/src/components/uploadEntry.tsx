import { type SyncState } from '../domain/sync'
import {
	Switch,
	Match,
	Show,
	type VoidComponent,
	type Setter,
	type Accessor,
	createSignal,
	type ParentComponent,
} from 'solid-js'

export const UploadEntry: ParentComponent<{
	upload: () => Promise<void>
	remote: Record<string, unknown> | null | undefined
}> = (props) => {
	const [state, setState] = createSignal<SyncState>('different')
	return (
		<>
			{state() === 'uploaded' ? (
				<div class='flex justify-end'>Uploaded</div>
			) : (
				<div class='flex flex-col gap-2 py-2 leading-normal'>
					<UploadButton
						upload={props.upload}
						state={state}
						setState={setState}
					/>
					<Show when={props.remote} fallback={<div>Not yet uploaded.</div>}>
						{props.children}
					</Show>
				</div>
			)}
		</>
	)
}

const UploadButton: VoidComponent<{
	upload: () => Promise<void>
	state: Accessor<SyncState>
	setState: Setter<SyncState>
}> = (props) => {
	return (
		<div class='flex justify-end'>
			<Switch>
				<Match when={props.state() === 'uploading'}>Uploading...</Match>
				<Match
					when={props.state() === 'different' || props.state() === 'errored'}
				>
					<>
						<Show when={props.state() === 'errored'}>
							<span class='pr-2'>Errored, try again?</span>
						</Show>
						<button
							class='border-gray-900 rounded-lg border px-2'
							onClick={async () => {
								props.setState('uploading')
								try {
									await props.upload()
								} catch (error) {
									props.setState('errored')
									throw error
								}
								props.setState('uploaded')
							}}
						>
							Upload
						</button>
					</>
				</Match>
			</Switch>
		</div>
	)
}
