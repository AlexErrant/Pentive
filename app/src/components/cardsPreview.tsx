import { type VoidComponent } from "solid-js"
import ResizingIframe from "./resizingIframe"
import { type NoteCardView } from "../pages/cards"
import { type NoteCard } from "shared"

export const CardsPreview: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  const noteCard = () => {
    const nc = props.noteCard
    const selected: NoteCard = {
      ...nc,
      note: {
        ...nc.note,
        fieldValues: new Map(nc.note.fieldValues),
      },
    }
    return selected
  }
  return (
    <>
      <ResizingIframe
        i={{
          tag: "manualCard",
          side: "front",
        }}
        noteCard={noteCard()}
      />
      <ResizingIframe
        i={{
          tag: "manualCard",
          side: "back",
        }}
        noteCard={noteCard()}
      />
    </>
  )
}
