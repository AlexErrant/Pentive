import { createSignal, type JSX, Show } from "solid-js"
import CardsTable from "../components/cardsTable"
import { type NoteCard } from "shared"
import { CardsRemote } from "../components/cardsRemote"
import { FieldsEditor } from "../components/fieldsEditor"
import { CardsPreview } from "../components/cardsPreview"

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createSignal<NoteCard>()
  return (
    <>
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
