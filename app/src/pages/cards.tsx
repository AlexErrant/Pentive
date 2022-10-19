import { JSX } from "solid-js"
import CardsTable from "../custom-elements/cardsTable"
import { db } from "../messenger"

export default function Cards(): JSX.Element {
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Cards</h1>
      </section>
      <CardsTable getNoteCards={db.getNoteCards} />
    </>
  )
}
