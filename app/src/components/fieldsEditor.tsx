import { For, type VoidComponent } from "solid-js"
import { FieldEditor } from "./fieldEditor"
import { toNoteCards, type NoteCardView } from "../pages/cards"
import { type SetStoreFunction } from "solid-js/store"
import { db } from "../db"
import { getKysely } from "../sqlite/crsqlite"
import { throwExp } from "shared"

export const FieldsEditor: VoidComponent<{
  readonly noteCard: NoteCardView
  readonly setNoteCard: SetStoreFunction<{
    selected?: NoteCardView
  }>
}> = (props) => {
  return (
    <>
      <For each={props.noteCard.note.fieldValues}>
        {([field, value], i) => (
          <FieldEditor
            field={field}
            value={value}
            setNoteCard={props.setNoteCard}
            i={i()}
          />
        )}
      </For>
      <button
        onClick={async () => {
          const noteCards = toNoteCards(props.noteCard)
          if (noteCards.length === 0) throwExp("There must be at least 1 card")
          const kysely = await getKysely()
          await kysely.transaction().execute(async (trx) => {
            await db.upsertNote(noteCards[0].note, trx)
            await db.bulkUpsertCards(
              noteCards.map((nc) => nc.card),
              trx
            )
          })
        }}
      >
        Save
      </button>
    </>
  )
}
