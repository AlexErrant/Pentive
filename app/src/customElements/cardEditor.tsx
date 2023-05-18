import { type VoidComponent } from "solid-js"
import { type NoteCard } from "shared"
import { CardsRemote } from "./cardsRemote"
import { FieldsEditor } from "./fieldsEditor"
import { CardsPreview } from "./cardsPreview"

export const CardEditor: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  return (
    <>
      <CardsRemote noteCard={props.noteCard} />
      <FieldsEditor noteCard={props.noteCard} />
      <CardsPreview noteCard={props.noteCard} />
    </>
  )
}
