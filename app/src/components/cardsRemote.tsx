import {
  createResource,
  For,
  type Setter,
  Show,
  type VoidComponent,
} from "solid-js"
import {
  objEntries,
  type NookId,
  type NoteId,
  type RemoteNoteId,
  type RemoteTemplateId,
} from "shared"
import { db } from "../db"
import { type NoteCardView } from "../pages/cards"

function toggleNook(
  uploadable: boolean,
  noteId: NoteId,
  nook: NookId,
  setRemotes: Setter<
    Array<{
      readonly nookId: NookId
      readonly remoteTemplateId: RemoteTemplateId | null
      readonly remoteNoteId: RemoteNoteId | null
      readonly uploadable: boolean
    }>
  >
) {
  return (
    <input
      type="checkbox"
      checked={uploadable}
      onChange={async () => {
        uploadable = !uploadable
        setRemotes((rs) =>
          rs.map((r) => (r.nookId === nook ? { ...r, uploadable } : r))
        )
        uploadable
          ? await db.makeNoteUploadable(noteId, nook)
          : await db.makeNoteNotUploadable(noteId, nook)
      }}
    />
  )
}

export const CardsRemote: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  const [getRemotes, { mutate: setRemotes }] = createResource(
    () => props.noteCard,
    ({ note, template }) =>
      objEntries(template.remotes).map(([nookId, remoteTemplateId]) => {
        const remote = note.remotes.get(nookId) ?? null
        const uploadable = note.remotes.has(nookId)
        return {
          nookId,
          remoteTemplateId,
          remote,
          uploadable,
        } as const
      }),
    { initialValue: [] }
  )
  return (
    <Show when={getRemotes().length !== 0}>
      Remote Nooks:
      <For each={getRemotes()}>
        {(x) => (
          <li class="py-2 px-4">
            {x.uploadable ? "✔" : ""}
            <Show when={x.remote != null} fallback={x.nookId}>
              <a
                href={`${import.meta.env.VITE_HUB_ORIGIN}/n/${
                  x.remote!.remoteNoteId
                }`}
              >
                {x.nookId}
              </a>
            </Show>
            {toggleNook(
              x.uploadable,
              props.noteCard.note.id,
              x.nookId,
              setRemotes
            )}
          </li>
        )}
      </For>
    </Show>
  )
}
