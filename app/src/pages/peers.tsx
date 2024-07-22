import {
	For,
	Show,
	type VoidComponent,
	createResource,
	createSignal,
} from 'solid-js'
import { stringify as uuidStringify } from 'uuid'
import { cwaClient, isTrpcClientError } from '../trpcClient'
import {
	type PeerJsId,
	peerDisplayNameValidator,
	peerIdValidator,
} from 'shared'
import PeersTable, { type Peer } from '../components/peersTable'
import { createWdbRtc } from '../sqlite/crsqlite'
import { rd } from '../topLevelAwait'
import { type WholeDbRtcPublic } from '../sqlite/wholeDbRtc'

export default function Peers() {
	const [pending, setPending] = createSignal<string[]>([])
	const [established, setEstablished] = createSignal<string[]>([])
	const [wdbRtc] = createResource(async () => {
		try {
			const wdbRtc = await createWdbRtc(rd)
			// highTODO this returns a cleanup function; use it
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const cleanup = wdbRtc.onConnectionsChanged((pending, established) => {
				setPending(pending)
				setEstablished(established)
			})
			return wdbRtc
		} catch (error) {
			if (isTrpcClientError(error) && error.data?.httpStatus === 401) {
				return null
			}
			throw error
		}
	})
	return (
		<Show when={wdbRtc()} fallback={'Loading...'}>
			<RenderPeerControls
				wdbRtc={wdbRtc()!}
				pending={pending()}
				established={established()}
			/>
		</Show>
	)
}

const RenderPeerControls: VoidComponent<{
	wdbRtc: WholeDbRtcPublic
	pending: string[]
	established: string[]
}> = (props) => {
	const siteId = () => peerIdValidator.parse(uuidStringify(props.wdbRtc.siteId))
	const [peers] = createResource(
		// eslint-disable-next-line solid/reactivity
		async () => {
			const peers = await cwaClient.getPeer.query()
			if (peers == null) {
				return []
			}
			return Object.entries(peers).map(
				([peerId, peerName]) =>
					({
						id: peerId as PeerJsId,
						name: peerName,
						status: siteId() === peerId ? 'self' : 'disconnected',
					}) satisfies Peer as Peer,
			)
		},
		{
			initialValue: [],
		},
	)
	const updated = () =>
		peers().map((p) =>
			props.established.includes(p.id)
				? {
						...p,
						status: 'connected' as const,
					}
				: props.pending.includes(p.id)
					? {
							...p,
							status: 'pending' as const,
						}
					: p,
		)
	const [name, setName] = createSignal('')
	return (
		<>
			<PeersTable peers={peers()} updated={updated()} wdbRtc={props.wdbRtc} />
			<input
				class='w-75px form-input rounded-lg p-1 text-sm'
				type='text'
				onInput={(e) => setName(e.currentTarget.value)}
			/>
			<button
				type='button'
				class='border-gray-900 rounded-lg border px-2'
				onClick={async () => {
					const displayName = peerDisplayNameValidator.parse(name())
					await cwaClient.setPeer.mutate({
						peerId: siteId(),
						displayName,
					})
				}}
			>
				Add {siteId()} as peer
			</button>
			<button
				type='button'
				onClick={async () => {
					await navigator.clipboard.writeText(siteId())
				}}
			>
				PeerID: {siteId()}
			</button>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const formData = new FormData(e.target as HTMLFormElement)
					const remotePeerId = formData.get('remotePeerId') as string
					props.wdbRtc.connectTo(remotePeerId)
				}}
			>
				<label for='remotePeerId'>Connect to</label>
				<input
					name='remotePeerId'
					class='w-75px form-input rounded-lg border p-1 text-sm'
					type='text'
				/>
			</form>
			<ul>
				<For each={props.pending}>
					{(p) => <li style={{ color: 'orange' }}>{p}</li>}
				</For>
			</ul>
			<ul class='established'>
				<For each={props.established}>
					{(p) => <li style={{ color: 'green' }}>{p}</li>}
				</For>
			</ul>
		</>
	)
}
