import { useRouteData } from "solid-app-router"
import { createEffect, createSignal, JSX } from "solid-js"
import { sampleCard, Card } from "../domain/card"
import { defaultTemplate, Template } from "../domain/template"
import * as rxdb from "../../secure/rxdb/rxdb"
import HomeData from "./home.data"
import { db } from "../messenger"
import { Plugin } from "../../src/domain/plugin"

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(1)
  const [template, setTemplate] = createSignal<Template | null>(null)
  const [card, setCard] = createSignal<Card | null>(null)
  const [plugins, setPlugins] = createSignal<Plugin[]>([])
  const age = useRouteData<typeof HomeData>()

  console.log(count())
  createEffect(() => {
    console.log(age())
    setCount(age())
  })

  createEffect(() => {
    console.log(template())
  })

  createEffect(() => {
    console.log(card())
  })

  createEffect(() => {
    console.log(plugins())
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
          onClick={async () => await db.upsertHero(count())}
        >
          upsert
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={rxdb.remove}
        >
          remove
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={rxdb.sync}
        >
          sync
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.upsertTemplate(defaultTemplate)}
        >
          upsertTemplate
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () =>
            setTemplate(await db.getTemplate(defaultTemplate.id))
          }
        >
          getTemplate
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.upsertCard(sampleCard)}
        >
          upsertCard
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => setCard(await db.getCard(sampleCard.id))}
        >
          getCard
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            const config = await fetch("/pentive-nav.js")
            const plugin = {
              id: "520E5C04-93DF-4DB8-B51A-0B5EAE843356",
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              name: "plain pentive nav",
              script: await config.blob(),
            }
            await db.upsertPlugin(plugin)
          }}
        >
          upsertPlugin
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.getPlugins().then(setPlugins)}
        >
          getPlugin
        </button>
      </div>
    </section>
  )
}
