import { Select } from "@thisbeyond/solid-select"
import "@thisbeyond/solid-select/style.css"
import { Suspense, createSignal } from "solid-js"
import type AddNoteData from "./addNote.data"
import { useRouteData } from "@solidjs/router"

export default function AddNote() {
  const data = useRouteData<typeof AddNoteData>()
  const templateNames = () => data()?.map((t) => t.name) ?? []
  const [template, setTemplate] = createSignal(null)

  return (
    <>
      <h1 class="text-2xl font-bold">Add Note</h1>
      Template:
      <Suspense fallback={<span>Loading...</span>}>
        <Select
          initialValue={templateNames().at(0)}
          options={templateNames()}
          onChange={setTemplate}
        />
        Selected: {template()}
      </Suspense>
    </>
  )
}
