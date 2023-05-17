import {
  createResource,
  For,
  type Setter,
  Show,
  type VoidComponent,
} from "solid-js"
import ResizingIframe from "../customElements/resizingIframe"
import {
  type NoteCard,
  type NookId,
  type NoteId,
  type RemoteNoteId,
  type RemoteTemplateId,
} from "shared"
import { db } from "../db"
import { FieldEditor } from "./fieldEditor"

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

export const CardEditor: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  const [getRemotes, { mutate: setRemotes }] = createResource(
    () => props.noteCard,
    ({ note, template }) =>
      Array.from(template.remotes).map(([nookId, remoteTemplateId]) => {
        const remoteNoteId = note.remotes.get(nookId) ?? null
        const uploadable = note.remotes.has(nookId)
        return {
          nookId,
          remoteTemplateId,
          remoteNoteId,
          uploadable,
        } as const
      }),
    { initialValue: [] }
  )
  return (
    <>
      <For each={Array.from(props.noteCard.note.fieldValues.entries() ?? [])}>
        {([field, value]) => FieldEditor({ field, value })}
      </For>
      <For each={getRemotes()}>
        {(x) => (
          <li class="py-2 px-4">
            {x.uploadable ? "✔" : ""}
            <Show when={x.remoteNoteId != null} fallback={x.nookId}>
              <a href={`https://pentive.com/n/${x.remoteNoteId!}`}>
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
      <ResizingIframe
        i={{
          tag: "card",
          side: "front",
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      ></ResizingIframe>
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      ></ResizingIframe>
    </>
  )
}
