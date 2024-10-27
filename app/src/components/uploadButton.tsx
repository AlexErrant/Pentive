import { type SyncState } from '../domain/sync'
import {
	Switch,
	Match,
	Show,
	type VoidComponent,
	type Setter,
	type Accessor,
} from 'solid-js'

export const UploadButton: VoidComponent<{
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
