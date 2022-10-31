import { createSignal, JSX } from "solid-js"
import CardsTable from "../custom-elements/cardsTable"
import ResizingIframe from "../custom-elements/resizing-iframe"
import { NoteCard } from "../domain/card"

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
  if (selected() == null) {
    return <></>
  }
  const { note, card, template } = selected() as NoteCard
  if (note == null || template == null) {
    return <span>Loading...</span>
  }
  return (
    <>
      <ResizingIframe
        i={{
          tag: "card",
          side: "front",
          templateId: template.id,
          noteId: note.id,
          cardId: card.id,
        }}
      ></ResizingIframe>
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          templateId: template.id,
          noteId: note.id,
          cardId: card.id,
        }}
      ></ResizingIframe>
    </>
  )
}
