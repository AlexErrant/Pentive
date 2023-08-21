import {
  type VoidComponent,
  For,
  Show,
  createResource,
  Switch,
  Match,
} from "solid-js"
import { type RemoteNoteId } from "shared"
import { cwaClient } from "../trpcClient"
import DiffHtml from "./diffHtml"
import { type NoteCardView } from "../pages/cards"

const NoteSync: VoidComponent<{ note: NoteCardView }> = (props) => (
  <ul>
    <For each={Array.from(props.note.note.remotes)}>
      {([nookId, remoteNote]) => (
        <li>
          <h2>/n/{nookId}</h2>
          <Show when={remoteNote} fallback={`Not yet uploaded.`}>
            <NoteNookSync note={props.note} remoteNote={remoteNote!} />
          </Show>
        </li>
      )}
    </For>
  </ul>
)

export default NoteSync

const NoteNookSync: VoidComponent<{
  note: NoteCardView
  remoteNote: {
    remoteNoteId: RemoteNoteId
    uploadDate: Date
  }
}> = (props) => {
  const [remoteNote] = createResource(
    () => props.remoteNote.remoteNoteId,
    async (id) => await cwaClient.getNote.query(id) // medTODO planetscale needs an id that associates all notes so we can lookup in 1 pass. Also would be useful to find "related" notes
  )
  return (
    <Show when={remoteNote()}>
      <ul>
        <For
          each={Array.from(
            (() => {
              const m = new Map<
                string,
                [string | undefined, string | undefined]
              >()
              for (const [field, value] of props.note.note.fieldValues) {
                m.set(field, [value, undefined])
              }
              for (const [field, value] of remoteNote()!.fieldValues) {
                m.set(field, [m.get(field)?.at(0), value])
              }
              return m
            })()
          )}
        >
          {([field, [local, remote]]) => (
            <li>
              <Switch
                fallback={
                  <DiffHtml
                    before={remote!}
                    after={local!}
                    css={props.note.template.css}
                    title={field}
                  />
                }
              >
                <Match when={local == null}>
                  <h2>Deleted</h2>
                  <pre>{JSON.stringify(remote, null, 4)}</pre>
                </Match>
                <Match when={remote == null}>
                  <h2>Added</h2>
                  <pre>{JSON.stringify(local, null, 4)}</pre>
                </Match>
              </Switch>
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}
