import { type JSX, Show, createResource, createEffect } from "solid-js"
import { createStore } from "solid-js/store"
import CardsTable from "../components/cardsTable"
import {
  type Override,
  type NoteCard,
  type Template,
  type Card,
  throwExp,
} from "shared"
import { CardsRemote } from "../components/cardsRemote"
import { FieldsEditor } from "../components/fieldsEditor"
import { CardsPreview } from "../components/cardsPreview"
import { db } from "../db"

export interface NoteCardView {
  template: Template
  note: Override<NoteCard["note"], { fieldValues: Array<[string, string]> }>
  mainCard?: Card
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

export function toMainNoteCards(noteCardView: NoteCardView): NoteCard {
  return {
    template: noteCardView.template,
    note: {
      ...noteCardView.note,
      fieldValues: new Map(noteCardView.note.fieldValues),
    },
    card: noteCardView.mainCard ?? throwExp("YA DONE GOOFED"),
  }
}

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createStore<{ selected?: NoteCardView }>({})
  const [cards] = createResource(
    () => selected.selected?.note.id,
    db.getCardsByNote
  )
  createEffect(() => {
    if (cards() != null) setSelected("selected", "cards", cards()!)
  })
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
              mainCard: nc.card,
              cards: [],
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
