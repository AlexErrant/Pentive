import {
  createResource,
  createSignal,
  For,
  type JSX,
  type Setter,
  Show,
  type VoidComponent,
} from "solid-js"
import CardsTable from "../customElements/cardsTable"
import ResizingIframe from "../customElements/resizingIframe"
import {
  type NoteCard,
  type NookId,
  type NoteId,
  type RemoteNoteId,
  type RemoteTemplateId,
} from "shared"
import { db } from "../db"

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createSignal<NoteCard>()
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
      <Show when={selected() != null}>
        <CardPreview noteCard={selected()!} />
      </Show>
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

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardPreview: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  const [template] = createResource(
    props.noteCard,
    async (noteCard) => await db.getTemplate(noteCard.template.id)
  )
  const [note] = createResource(
    props.noteCard,
    async (noteCard) => await db.getNote(noteCard.note.id)
  )
  const [getRemotes, { mutate: setRemotes }] = createResource(
    [note(), template()],
    ([note, template]) => {
      if (note == null || template == null) return []
      return Array.from(template.remotes).map(([nookId, remoteTemplateId]) => {
        const remoteNoteId = note.remotes.get(nookId) ?? null
        const uploadable = note.remotes.has(nookId)
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
    <>
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
              props.noteCard.note.id,
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
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      ></ResizingIframe>
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      ></ResizingIframe>
    </>
  )
}
