import { createResource, createSignal, For, JSX, Show } from "solid-js"
import CardsTable from "../custom-elements/cardsTable"
import ResizingIframe from "../custom-elements/resizing-iframe"
import { NoteCard } from "../domain/card"
import { db } from "../db"

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

const cardPreview = (): JSX.Element => {
  const [getRemotes] = createResource(
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
