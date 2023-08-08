import { For, Show, createResource, createSignal } from "solid-js"
import { getCrRtc } from "../sqlite/crsqlite"
import { stringify as uuidStringify } from "uuid"
import { cwaClient } from "../trpcClient"
import { peerValidator } from "shared"

export default function Peers() {
  const [pending, setPending] = createSignal<string[]>([])
  const [established, setEstablished] = createSignal<string[]>([])
  const [siteId] = createResource(async () => {
    const rtc = await getCrRtc()
    // highTODO this returns a cleanup function; use it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanup = rtc.onConnectionsChanged((pending, established) => {
      setPending(pending)
      setEstablished(established)
    })
    return uuidStringify(rtc.siteId)
  })
  return (
    <div class="peers">
      <Show when={siteId()}>
        {peers()}
        <button
          type="button"
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await cwaClient.setPeer.mutate(siteId()!)
          }}
        >
          Add {siteId()!} as peer
        </button>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(siteId()!)
          }}
        >
          PeerID: {siteId()}
        </button>
      </Show>
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
        <For each={pending()}>
          {(p) => <li style={{ color: "orange" }}>{p}</li>}
        </For>
      </ul>
      <ul class="established">
        <For each={established()}>
          {(p) => <li style={{ color: "green" }}>{p}</li>}
        </For>
      </ul>
    </div>
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
