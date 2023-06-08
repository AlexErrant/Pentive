import { createSignal, type JSX, Show } from "solid-js"
import CardsTable from "../customElements/cardsTable"
import { type NoteCard } from "shared"
import { CardsRemote } from "../customElements/cardsRemote"
import { FieldsEditor } from "../customElements/fieldsEditor"
import { CardsPreview } from "../customElements/cardsPreview"

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
        <CardsRemote noteCard={selected()!} />
        <FieldsEditor noteCard={selected()!} />
        <CardsPreview noteCard={selected()!} />
      </Show>
    </>
  )
}
