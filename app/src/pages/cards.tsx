import { createResource, createSignal, For, JSX, Setter, Show } from "solid-js"
import CardsTable from "../custom-elements/cardsTable"
import ResizingIframe from "../custom-elements/resizingIframe"
import { NoteCard } from "../domain/card"
import { db } from "../db"
import { NookId, NoteId, RemoteNoteId, RemoteTemplateId } from "shared"

const [selected, setSelected] = createSignal<NoteCard>()

export default function Cards(): JSX.Element {
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Cards</h1>
      </section>
      <CardsTable
        onSelectionChanged={(ncs) => {
          if (ncs.length > 0) {
            setSelected(ncs[0])
          } else {
            setSelected(undefined)
          }
        }}
      />
      {cardPreview()}
    </>
  )
}

function toggleNook(
  uploadable: boolean,
  noteId: NoteId,
  nook: NookId,
  setRemotes: Setter<
    Array<{
      readonly nookId: NookId
      readonly remoteTemplateId: RemoteTemplateId | null
      readonly remoteNoteId: RemoteNoteId | null
      readonly uploadable: boolean
    }>
  >
) {
  return (
    <input
      type="checkbox"
      checked={uploadable}
      onChange={async () => {
        uploadable = !uploadable
        setRemotes((rs) =>
          rs.map((r) => (r.nookId === nook ? { ...r, uploadable } : r))
        )
        uploadable
          ? await db.makeNoteUploadable(noteId, nook)
          : await db.makeNoteNotUploadable(noteId, nook)
      }}
    />
  )
}

const cardPreview = (): JSX.Element => {
  const [getRemotes, { mutate: setRemotes }] = createResource(
    selected(),
    async (selected) => {
      const template = await db.getTemplate(selected.template.id)
      const note = await db.getNote(selected.note.id)
      return Array.from(template!.remotes).map(([nookId, remoteTemplateId]) => {
        const remoteNoteId = note!.remotes.get(nookId) ?? null
        const uploadable = note!.remotes.has(nookId)
        return {
          nookId,
          remoteTemplateId,
          remoteNoteId,
          uploadable,
        } as const
      })
    },
    { initialValue: [] }
  )
  return (
    <Show when={selected() != null}>
      <For each={getRemotes()}>
        {(x) => (
          <li class="py-2 px-4">
            {x.uploadable ? "✔" : ""}
            <Show when={x.remoteNoteId != null} fallback={x.nookId}>
              <a href={`https://pentive.com/n/${x.remoteNoteId!}`}>
                {x.nookId}
              </a>
            </Show>
            {toggleNook(
              x.uploadable,
              selected()!.note.id,
              x.nookId,
              setRemotes
            )}
          </li>
        )}
      </For>
      <ResizingIframe
        i={{
          tag: "card",
          side: "front",
          templateId: selected()!.template.id,
          noteId: selected()!.note.id,
          cardId: selected()!.card.id,
        }}
      ></ResizingIframe>
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          templateId: selected()!.template.id,
          noteId: selected()!.note.id,
          cardId: selected()!.card.id,
        }}
      ></ResizingIframe>
    </Show>
  )
}
