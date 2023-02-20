import { useRouteData } from "solid-app-router"
import { createEffect, createSignal, JSX } from "solid-js"
import { sampleCard, Card } from "../domain/card"
import { sampleNote, Note } from "../domain/note"
import { defaultTemplate, Template } from "../domain/template"
import HomeData from "./home.data"
import { db } from "../db"
import { lrpc } from "../lrpcClient"
import { importAnki } from "./importer/importer"
import { csrfHeaderName, NoteId, RemoteNoteId, throwExp } from "shared"
import { MediaId, RemoteMediaNum, RemoteTemplateId } from "../domain/ids"
import { apiClient } from "../apiClient"

async function uploadNewTemplates(): Promise<void> {
  const id = await lrpc.addTemplate.mutate({
    name: "a template name",
  })
  console.log("id is", id)
  const r = await lrpc.getTemplate.query(id)
  const newTemplates = await db.getNewTemplatesToUpload("aRandomNook")
  const remoteIdByLocal = await lrpc.addTemplates.mutate(newTemplates)
  const remoteIds = Object.values(remoteIdByLocal)
  const getBatch = await lrpc.getTemplates.query(remoteIds)
  console.log("getTemplates", getBatch)
  console.log(r)
}

async function makeNoteUploadable() {
  await db.makeNoteUploadable(
    sampleNote.id,
    "9P1IlXnSRviXmwAA8kTMKw" as RemoteTemplateId
  )
}

async function uploadNewNotes(): Promise<void> {
  const notes = await db.prepareAndGetNewNotesToUpload()
  const media = await db.getMediaToUpload()
  if (notes.length > 0) {
    const remoteIdByLocal = await apiClient.createNote.mutate(notes)
    await db.updateRemoteIds(remoteIdByLocal)
    console.log(remoteIdByLocal)
    for (const [mediaId, { data, ids }] of media) {
      await postMedia(mediaId, ids, remoteIdByLocal, data)
    }
  } else {
    console.log("Nothing to upload!")
  }
}

async function postMedia(
  mediaId: MediaId,
  ids: Array<[NoteId, RemoteMediaNum]>,
  remoteIdByLocal: Record<NoteId, RemoteNoteId>,
  data: ArrayBuffer
): Promise<void> {
  const remoteNoteIdAndRemoteMediaNum = ids.map(([noteId, remoteMediaNum]) => {
    const remoteNoteId =
      remoteIdByLocal[noteId] ??
      throwExp(`remoteIdByLocal is missing ${noteId} - how?`)
    return [remoteNoteId, remoteMediaNum.toString()]
  })
  const response = await fetch(
    import.meta.env.VITE_API_URL +
      "media/note?" +
      new URLSearchParams(remoteNoteIdAndRemoteMediaNum).toString(),
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
  await db.updateNote({
    ...note,
    fieldValues: {
      front: note.fieldValues.front + "!",
      back: note.fieldValues.back + "!",
    },
    push: true,
  })
}

async function searchNotes(search: string): Promise<void> {
  const searchBatch = await lrpc.searchNotes.query(search)
  console.log(searchBatch)
}

export default function Home(): JSX.Element {
  const [count, setCount] = createSignal(1)
  const [search, setSearch] = createSignal("")
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
          onClick={async () => await db.sync()}
        >
          sync
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            console.log(await apiClient.hello.query("Harrowhark"))
          }}
        >
          Hello tRPC
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => {
            console.log(await apiClient.authedHello.query())
          }}
        >
          Hello Auth
        </button>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.insertTemplate(defaultTemplate)}
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
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={makeNoteUploadable}
        >
          makeNoteUploadable
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={uploadNewNotes}
        >
          uploadNewNotes
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await searchNotes(search())}
        >
          searchNotes
        </button>
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await updateNotes()}
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
        <label>
          Import Anki apkg
          <input type="file" onchange={importAnki} accept=".apkg"></input>
        </label>
      </div>
      <div class="mt-4">
        <label>
          Upload Media
          <input type="file" onchange={uploadMedia} accept="image/*"></input>
        </label>
      </div>
      <div class="mt-4">
        <button
          class="border rounded-lg px-2 border-gray-900"
          onClick={async () => await db.sync()}
        >
          sync
        </button>
      </div>
    </section>
  )
}

async function uploadMedia(
  event: Event & {
    currentTarget: HTMLInputElement
    target: Element
  }
): Promise<void> {
  const file =
    // My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
    (event.target as HTMLInputElement).files?.item(0) ??
    throwExp("Impossible - there should be a file selected")
  await db.bulkAddMedia([
    {
      id: file.name as MediaId,
      created: new Date(),
      data: await file.arrayBuffer(),
    },
  ])
}
