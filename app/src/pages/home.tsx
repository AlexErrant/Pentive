import { useRouteData } from "@solidjs/router"
import {
  createEffect,
  createSignal,
  type VoidComponent,
  type JSX,
  type Setter,
} from "solid-js"
import {
  sampleCard,
  type Card,
  sampleNote,
  type Note,
  defaultTemplate,
  type Template,
  type Base64Url,
  csrfHeaderName,
  type NookId,
  throwExp,
  type MediaId,
  type RemoteMediaNum,
} from "shared"
import type HomeData from "./home.data"
import { db } from "../db"
import { importAnki } from "./importer/importer"
import { cwaClient, augcClient } from "../trpcClient"
import { getDb } from "../sqlite/crsqlite"
import Peers from "./peers"
import { C } from ".."

async function uploadTemplates(): Promise<void> {
  const newTemplates = await db.getNewTemplatesToUpload()
  if (newTemplates.length > 0) {
    const remoteIdByLocal = await cwaClient.createTemplates.mutate(newTemplates)
    await db.updateTemplateRemoteIds(remoteIdByLocal)
  }
  const editedTemplates = await db.getEditedTemplatesToUpload()
  if (editedTemplates.length > 0) {
    await cwaClient.editTemplates.mutate(editedTemplates)
    await db.markTemplateAsPushed(editedTemplates.flatMap((n) => n.remoteIds))
  }
  const media = await db.getTemplateMediaToUpload()
  for (const [mediaId, { data, ids }] of media) {
    await postMedia("template", mediaId, ids, data)
  }
  if (
    editedTemplates.length === 0 &&
    newTemplates.length === 0 &&
    media.size === 0
  ) {
    console.log("Nothing to upload!")
  }
}

async function makeNoteUploadable() {
  await db.makeNoteUploadable(sampleNote.id, "a_random_nook" as NookId)
}

async function makeTemplateUploadable() {
  await db.makeTemplateUploadable(defaultTemplate.id, "a_random_nook" as NookId)
}

async function uploadNotes(): Promise<void> {
  const newNotes = await db.getNewNotesToUpload()
  if (newNotes.length > 0) {
    const remoteIdByLocal = await cwaClient.createNote.mutate(newNotes)
    await db.updateNoteRemoteIds(remoteIdByLocal)
  }
  const editedNotes = await db.getEditedNotesToUpload()
  if (editedNotes.length > 0) {
    await cwaClient.editNote.mutate(editedNotes)
    await db.markNoteAsPushed(
      editedNotes.flatMap((n) => Array.from(n.remoteIds.keys()))
    )
  }
  const media = await db.getNoteMediaToUpload()
  for (const [mediaId, { data, ids }] of media) {
    await postMedia("note", mediaId, ids, data)
  }
  if (editedNotes.length === 0 && newNotes.length === 0 && media.size === 0) {
    console.log("Nothing to upload!")
  }
}

async function postMedia(
  type: "note" | "template",
  mediaId: MediaId,
  ids: Array<[Base64Url, Base64Url, RemoteMediaNum]>, // localId, remoteId, i
  data: ArrayBuffer
): Promise<void> {
  const remoteEntityIdAndRemoteMediaNum = ids.map(
    ([, remoteEntityId, remoteMediaNum]) => [
      remoteEntityId,
      remoteMediaNum.toString(),
    ]
  )
  const response = await fetch(
    import.meta.env.VITE_CWA_URL +
      `media/${type}?` +
      new URLSearchParams(remoteEntityIdAndRemoteMediaNum).toString(),
    {
      method: "POST",
      body: data,
      credentials: "include",
      headers: new Headers({
        [csrfHeaderName]: "",
      }),
    }
  )
  // eslint-disable-next-line yoda
  if (200 <= response.status && response.status <= 299) {
    await db.updateUploadDate(ids)
  } else {
    console.error(
      `'${response.status}' HTTP status while uploading ${mediaId}.`
    )
  }
  console.log(response)
}

async function updateNotes(): Promise<void> {
  const note = await db.getNote(sampleNote.id)
  if (note == null) throwExp("No note!")
  note.fieldValues.set("front", note.fieldValues.get("front")! + "!")
  note.fieldValues.set("back", note.fieldValues.get("back")! + "!")
  await db.updateNote(note)
}

async function searchNotes(search: string): Promise<void> {
  const searchBatch = await augcClient.searchNotes.query(search)
  console.log(searchBatch)
}

const PluginChild: VoidComponent<{
  count: number
  setCount: Setter<number>
}> = (props) => {
  return (
    <div class="border rounded-lg p-1 m-1 border-gray-900">
      <h1>My Plugin Baby</h1>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count - 1)}
      >
        -
      </button>
      <output>Negative Count: {props.count * -1}</output>
      <button
        class="border rounded-lg px-2 mx-2 border-gray-900"
        onClick={() => props.setCount(props.count + 1)}
      >
        +
      </button>
    </div>
  )
}

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(1)
  const [search, setSearch] = createSignal("")
  const [template, setTemplate] = createSignal<Template | null>(null)
  const [card, setCard] = createSignal<Card | null>(null)
  const [note, setNote] = createSignal<Note | null>(null)
  const age = useRouteData<typeof HomeData>()

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

        <output class="p-10px">Count: {count()}</output>

        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={() => setCount(count() + 1)}
        >
          +
        </button>
      </div>
      <div class="flex items-center space-x-2">
        <C.examplePlugin
          count={count()}
          setCount={setCount}
          child={PluginChild}
        />
      </div>
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
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await db.insertTemplate(defaultTemplate)
          }}
        >
          insertTemplate
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
          onClick={makeTemplateUploadable}
        >
          makeTemplateUploadable
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={uploadTemplates}
        >
          uploadTemplates
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await db.upsertNote(sampleNote)
          }}
        >
          upsertNote
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => setNote(await db.getNote(sampleNote.id))}
        >
          getNote
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={makeNoteUploadable}
        >
          makeNoteUploadable
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={uploadNotes}
        >
          uploadNotes
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await searchNotes(search())
          }}
        >
          searchNotes
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await updateNotes()
          }}
        >
          updateNotes
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await searchNotes(search())
          }}
        >
          <input
            class="w-75px p-1 bg-white text-sm rounded-lg"
            type="text"
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </form>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            await db.upsertCard(sampleCard)
          }}
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
        <label>
          Import Anki apkg
          <input type="file" onChange={importAnki} accept=".apkg" />
        </label>
      </div>
      <div class="mt-4">
        <label>
          Upload Media
          <input type="file" onChange={uploadMedia} accept="image/*" />
        </label>
      </div>
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
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            const rawSql = formData.get("rawSql") as string
            await q(rawSql)()
          }}
        >
          <label for="rawSql">SQL</label>
          <input
            name="rawSql"
            class="w-75px p-1 bg-white text-sm rounded-lg border"
            type="text"
          />
        </form>
        <button class="px-2" onClick={q("select * from template")}>
          template
        </button>
        <button class="px-2" onClick={q("select * from remoteTemplate")}>
          remoteTemplate
        </button>
        <button class="px-2" onClick={q("select * from remoteNote")}>
          remoteNote
        </button>
        <button class="px-2" onClick={q("select * from remoteMedia")}>
          remoteMedia
        </button>
      </div>
      <div class="mt-4">
        <Peers />
      </div>
    </section>
  )
}

function q(rawSql: string) {
  return async () => {
    console.log(rawSql)
    console.table(await (await getDb()).execO(rawSql))
  }
}

async function uploadMedia(
  event: Event & {
    currentTarget: HTMLInputElement
    target: HTMLInputElement
  }
): Promise<void> {
  const file =
    // My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
    event.target.files?.item(0) ??
    throwExp("Impossible - there should be a file selected")
  await db.bulkAddMedia([
    {
      id: file.name as MediaId,
      created: new Date(),
      updated: new Date(),
      data: await file.arrayBuffer(),
    },
  ])
}
