import { type Component, For, Show, Suspense } from "solid-js"
import { type RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import {
  type NookId,
  type Ord,
  type RemoteNoteId,
  getNote,
  getNoteComments,
  unproxify,
} from "shared"
import ResizingIframe from "~/components/resizingIframe"
import NoteComment from "~/components/noteComment"
import SubmitComment from "~/components/submitComment"
import { cwaClient } from "~/routes/cwaClient"
import { getUserId } from "~/session"
import { getAppMessenger } from "~/root"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: () => params.nook as NookId,
    noteId: (): string => params.noteId,
    data: createServerData$(
      async (noteId, { request }) => {
        return {
          note: await getUserId(request).then(
            async (userId) => await getNote(noteId as RemoteNoteId, userId)
          ),
          comments: await getNoteComments(noteId as RemoteNoteId),
        }
      },
      { key: () => params.noteId }
    ),
  }
}

const Thread: Component = () => {
  const { data, nook } = useRouteData<typeof routeData>()
  return (
    <Suspense fallback={<p>Loading note...</p>}>
      <Show when={data()?.note} fallback={<p>"404 Not Found"</p>}>
        <div class="item-view-comments">
          <p class="item-view-comments-header">
            <ResizingIframe
              i={{
                tag: "card",
                side: "front",
                template: data()!.note!.template,
                ord: 0 as Ord,
                fieldsAndValues: Array.from(
                  data()!.note!.fieldValues.entries()
                ),
              }}
            />
            <ResizingIframe
              i={{
                tag: "card",
                side: "back",
                template: data()!.note!.template,
                ord: 0 as Ord,
                fieldsAndValues: Array.from(
                  data()!.note!.fieldValues.entries()
                ),
              }}
            />
          </p>
          <button
            onclick={async () => {
              await getAppMessenger().addNote(unproxify(data()!.note!), nook())
              await cwaClient.subscribeToNote.mutate(data()!.note!.id)
            }}
            disabled={data()?.note?.til != null}
          >
            Download
          </button>
          <ul class="comment-children">
            <SubmitComment
              onSubmit={async (text) => {
                await cwaClient.insertNoteComment.mutate({
                  noteId: data()!.note!.id,
                  text,
                })
              }}
            />
            <For each={data()!.comments}>
              {(comment) => <NoteComment comment={comment} />}
            </For>
          </ul>
        </div>
      </Show>
    </Suspense>
  )
}

export default Thread
