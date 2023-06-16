import { type JSX, Show } from "solid-js"
import { createStore } from "solid-js/store"
import CardsTable from "../components/cardsTable"
import { type NoteCard } from "shared"
import { CardsRemote } from "../components/cardsRemote"
import { FieldsEditor } from "../components/fieldsEditor"
import { CardsPreview } from "../components/cardsPreview"

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createStore<{ selected?: NoteCard }>({})
  return (
    <>
      <CardsTable
        onSelectionChanged={(ncs) => {
          if (ncs.length > 0) {
            setSelected("selected", ncs[0])
          } else {
            setSelected("selected", undefined)
          }
        }}
      />
      <Show when={selected.selected != null}>
        <CardsRemote noteCard={selected.selected!} />
        <FieldsEditor noteCard={selected.selected!} />
        <CardsPreview noteCard={selected.selected!} />
      </Show>
    </>
  )
}
