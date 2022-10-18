import { useRouteData } from "solid-app-router"
import { createEffect, createSignal, JSX } from "solid-js"
import { sampleCard, Card } from "../domain/card"
import { sampleNote, Note } from "../domain/note"
import { defaultTemplate, Template } from "../domain/template"
import HomeData from "./home.data"
import { db } from "../messenger"
import { lrpc } from "../lrpcClient"
import { importAnki } from "./importer/importer"

async function uploadNewTemplates(): Promise<void> {
  await lrpc.mutation("addTemplate", {
    id: "aRandomId",
    name: "a template name",
  })
  const r = await lrpc.query("getTemplate", "aRandomId")
  const newTemplates = await db.getNewTemplatesToUpload("aRandomNook")
  await lrpc.mutation("addTemplates", newTemplates)
  const getBatch = await lrpc.query(
    "getTemplates",
    newTemplates.map((t) => t.id)
  )
  console.log("getTemplates", getBatch)
  console.log(r)
}

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(1)
  const [template, setTemplate] = createSignal<Template | null>(null)
  const [card, setCard] = createSignal<Card | null>(null)
  const [note, setNote] = createSignal<Note | null>(null)
  const age = useRouteData<typeof HomeData>()

  console.log(count())
  createEffect(() => {
    console.log(age())
    setCount(age() as number) // not sure why, but changing to a mono repo changed the signature of this to include `undefined` - which is wrong. Whatever.
  })

  createEffect(() => {
    console.log(template())
  })

  createEffect(() => {
    console.log(card())
  })

  createEffect(() => {
    console.log(note())
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
          onClick={async () => await db.remove()}
        >
          remove
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.sync()}
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
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={uploadNewTemplates}
        >
          uploadNewTemplates
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.upsertNote(sampleNote)}
        >
          upsertNote
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => setNote(await db.getNote(sampleNote.id))}
        >
          getNote
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
        <input type="file" onchange={importAnki} accept=".apkg"></input>
      </div>
    </section>
  )
}
