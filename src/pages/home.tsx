import { createSignal, JSX } from "solid-js"
import * as rxdb from "../rxdb"

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(0)

  return (
    <section class="bg-gray-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Home</h1>
      <p class="mt-4">This is the home page.</p>

      <div class="flex items-center space-x-2">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => setCount(count() - 1)}
        >
          -
        </button>

        <output class="p-10px">Count: {count}</output>

        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => setCount(count() + 1)}
        >
          +
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await rxdb.upsert(count())}
        >
          upsert
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await rxdb.remove()}
        >
          remove
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => rxdb.sync()}
        >
          sync
        </button>
      </div>
    </section>
  )
}
