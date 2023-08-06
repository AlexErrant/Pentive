import { NavLink } from "@solidjs/router"
import { db } from "../db"
import { Show, createResource } from "solid-js"

async function uploadCount() {
  const newTemplates = await db.getNewTemplatesToUpload()
  const editedTemplates = await db.getNewTemplatesToUpload()
  const newNotes = await db.getNewNotesToUpload()
  const editedNotes = await db.getEditedNotesToUpload()
  return (
    newTemplates.length +
    editedTemplates.length +
    newNotes.length +
    editedNotes.length
  )
}

export function Upload() {
  const [count] = createResource(uploadCount, {
    initialValue: 0,
  })
  return (
    <NavLink
      href="/sync"
      activeClass="font-bold"
      class="relative mx-4 no-underline hover:underline
flex p-2.5 rounded-md cursor-pointer items-center justify-center transition text-zinc-700 hover:text-zinc-800 hover:bg-zinc-100"
    >
      Sync
      <Show when={count() > 0}>
        <div
          // https://stackoverflow.com/a/71440299
          class="absolute border border-black bg-lime-300 flex justify-center items-center font-normal px-1"
          style={{
            bottom: "0em",
            right: "-1.3em",
            "min-width": "1.6em",
            height: "1.6em",
            "border-radius": "0.8em",
          }}
          role="status"
        >
          {count()}
        </div>
      </Show>
    </NavLink>
  )
}
