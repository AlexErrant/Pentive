import { type JSX, Show } from "solid-js"
import { createStore } from "solid-js/store"
import CardsTable from "../components/cardsTable"
import { type Override, type NoteCard, type Template, type Card } from "shared"
import { CardsRemote } from "../components/cardsRemote"
import { FieldsEditor } from "../components/fieldsEditor"
import { CardsPreview } from "../components/cardsPreview"

export interface NoteCardView {
  template: Template
  note: Override<NoteCard["note"], { fieldValues: Array<[string, string]> }>
  cards: Card[]
}

export function toNoteCards(noteCardView: NoteCardView): NoteCard[] {
  return noteCardView.cards.map((card) => ({
    template: noteCardView.template,
    note: {
      ...noteCardView.note,
      fieldValues: new Map(noteCardView.note.fieldValues),
    },
    card,
  }))
}

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createStore<{ selected?: NoteCardView }>({})
  return (
    <>
      <CardsTable
        onSelectionChanged={(ncs) => {
          if (ncs.length > 0) {
            const nc = ncs[0]
            const selected: NoteCardView = {
              ...nc,
              note: {
                ...nc.note,
                fieldValues: Array.from(nc.note.fieldValues.entries()),
              },
              cards: [nc.card],
            }
            setSelected("selected", selected)
          } else {
            setSelected("selected", undefined)
          }
        }}
      />
      <Show when={selected.selected != null}>
        <CardsRemote noteCard={selected.selected!} />
        <FieldsEditor noteCard={selected.selected!} setNoteCard={setSelected} />
        <CardsPreview noteCard={selected.selected!} />
      </Show>
    </>
  )
}
