import { createMutation } from '@tanstack/solid-query'
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
					{props.children}
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
	const upload = createMutation(() => ({
		mutationFn: async () => {
			props.setState('uploading')
			await props.upload()
		},
		onSuccess: () => {
			props.setState('uploaded')
		},
		onError: (e) => {
			props.setState('errored')
			console.error(e)
			throw e // for some reason errors thrown here aren't logged in the console
		},
	}))
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
							disabled={upload.isPending}
							onClick={() => {
								upload.mutate()
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
