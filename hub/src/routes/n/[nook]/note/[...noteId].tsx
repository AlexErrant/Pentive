import { Component, For, Show, Suspense } from "solid-js"
import { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { Ord, RemoteNoteId, getNote, getNoteComments } from "shared"
import ResizingIframe from "~/components/resizingIframe"
import NoteComment from "~/components/noteComment"
import SubmitComment from "~/components/submitComment"
import { apiClient } from "~/routes/apiClient"
import { getUserId } from "~/db/session"

export function routeData({ params }: RouteDataArgs) {
  return {
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
  const { data } = useRouteData<typeof routeData>()
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
          </p>
          <button
            onclick={async () => {
              await apiClient.subscribeToNote.mutate(data()!.note!.id)
            }}
            disabled={data()?.note?.til != null}
          >
            Download
          </button>
          <ul class="comment-children">
            <SubmitComment
              onSubmit={async (text) =>
                await apiClient.insertNoteComment.mutate({
                  noteId: data()!.note!.id,
                  text,
                })
              }
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
