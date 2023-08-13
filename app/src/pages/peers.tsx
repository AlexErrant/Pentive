import {
  For,
  Show,
  type VoidComponent,
  createResource,
  createSignal,
} from "solid-js"
import { getCrRtc } from "../sqlite/crsqlite"
import { stringify as uuidStringify } from "uuid"
import { cwaClient, isTrpcClientError } from "../trpcClient"
import {
  type PeerJsId,
  peerDisplayNameValidator,
  peerIdValidator,
  type PeerDisplayName,
} from "shared"
import PeersTable from "../components/peersTable"

export default function Peers() {
  const [pending, setPending] = createSignal<string[]>([])
  const [established, setEstablished] = createSignal<string[]>([])
  const [siteId] = createResource(async () => {
    try {
      const rtc = await getCrRtc()
      // highTODO this returns a cleanup function; use it
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cleanup = rtc.onConnectionsChanged((pending, established) => {
        setPending(pending)
        setEstablished(established)
      })
      return peerIdValidator.parse(uuidStringify(rtc.siteId))
    } catch (error) {
      if (isTrpcClientError(error) && error.data?.httpStatus === 401) {
        return null
      }
      throw error
    }
  })
  return (
    <Show when={siteId()} fallback={"Loading..."}>
      <RenderPeerControls
        siteId={siteId()!}
        pending={pending()}
        established={established()}
      />
    </Show>
  )
}

export interface Peer {
  id: PeerJsId
  name: PeerDisplayName
}

const RenderPeerControls: VoidComponent<{
  siteId: PeerJsId
  pending: string[]
  established: string[]
}> = (props) => {
  const [peers, { mutate: setPeers }] = createResource(
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
          } satisfies Peer)
      )
    },
    {
      initialValue: [],
    }
  )
  const [name, setName] = createSignal("")
  return (
    <>
      <PeersTable peers={peers()} />
      <input
        class="w-75px p-1 bg-white text-sm rounded-lg"
        type="text"
        onInput={(e) => setName(e.currentTarget.value)}
      />
      <button
        type="button"
        class="border rounded-lg px-2 border-gray-900"
        onClick={async () => {
          const displayName = peerDisplayNameValidator.parse(name())
          await cwaClient.setPeer.mutate({
            peerId: props.siteId,
            displayName,
          })
        }}
      >
        Add {props.siteId} as peer
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(props.siteId)
        }}
      >
        PeerID: {props.siteId}
      </button>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const remotePeerId = formData.get("remotePeerId") as string
          const rtc = await getCrRtc()
          rtc.connectTo(remotePeerId)
        }}
      >
        <label for="remotePeerId">Connect to</label>
        <input
          name="remotePeerId"
          class="w-75px p-1 bg-white text-sm rounded-lg border"
          type="text"
        />
      </form>
      <ul>
        <For each={props.pending}>
          {(p) => <li style={{ color: "orange" }}>{p}</li>}
        </For>
      </ul>
      <ul class="established">
        <For each={props.established}>
          {(p) => <li style={{ color: "green" }}>{p}</li>}
        </For>
      </ul>
    </>
  )
}
