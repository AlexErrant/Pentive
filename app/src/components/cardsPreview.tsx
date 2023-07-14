import { For, Show, type VoidComponent } from "solid-js"
import ResizingIframe from "./resizingIframe"
import { toNoteCards, type NoteCardView, toMainNoteCards } from "../pages/cards"
import { type NoteCard } from "shared"

export const CardsPreview: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  return (
    <Show
      when={props.noteCard.mainCard != null}
      fallback={
        <For each={toNoteCards(props.noteCard)}>
          {(noteCard) => <CardPreview noteCard={noteCard} />}
        </For>
      }
    >
      <CardPreview noteCard={toMainNoteCards(props.noteCard)} />
    </Show>
  )
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function CardPreview(props: { noteCard: NoteCard }) {
  return (
    <>
      <ResizingIframe
        i={{
          tag: "card",
          side: "front",
          card: props.noteCard.card,
          note: props.noteCard.note,
          template: props.noteCard.template,
        }}
      />
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          card: props.noteCard.card,
          note: props.noteCard.note,
          template: props.noteCard.template,
        }}
      />
    </>
  )
}
