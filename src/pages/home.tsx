import { useRouteData } from "solid-app-router"
import { createEffect, createSignal, JSX } from "solid-js"
import { defaultTemplate, Template } from "../domain/template"
import * as rxdb from "../rxdb"
import HomeData from "./home.data"

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(1)
  const [template, setTemplate] = createSignal<Template | null>(null)
  const age = useRouteData<typeof HomeData>()

  console.log(count())
  createEffect(() => {
    console.log(age())
    setCount(age())
  })

  createEffect(() => {
    console.log(template())
  })

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
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await rxdb.upsertTemplate(defaultTemplate)}
        >
          upsertTemplate
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () =>
            setTemplate(await rxdb.getTemplate(defaultTemplate.id))
          }
        >
          getTemplate
        </button>
      </div>
    </section>
  )
}
