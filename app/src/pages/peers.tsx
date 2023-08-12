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
import { peerValidator } from "shared"

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
      return uuidStringify(rtc.siteId)
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

const RenderPeerControls: VoidComponent<{
  siteId: string
  pending: string[]
  established: string[]
}> = (props) => {
  return (
    <>
      {peers()}
      <button
        type="button"
        class="border rounded-lg px-2 border-gray-900"
        onClick={async () => {
          await cwaClient.setPeer.mutate(props.siteId)
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

function peers() {
  // eslint-disable-next-line solid/reactivity
  const [peers] = createResource(async () => await cwaClient.getPeer.query(), {
    initialValue: null,
  })
  const peerIds = () => {
    if (peers() != null) {
      return Object.keys(peerValidator.parse(peers()))
    }
    return null
  }
  return (
    <Show when={peerIds()}>
      <ul>
        <For each={peerIds()}>{(peerId) => <li>{peerId}</li>}</For>
      </ul>
    </Show>
  )
}
