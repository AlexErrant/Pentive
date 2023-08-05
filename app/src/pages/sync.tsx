import { type JSX } from "solid-js"
import { db } from "../db"
import Peers from "./peers"

export default function Sync(): JSX.Element {
  return (
    <section class="bg-gray-100 text-gray-700 p-8">
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await db.sync()
          }}
        >
          sync
        </button>
      </div>
      <div class="mt-4">
        <Peers />
      </div>
    </section>
  )
}
