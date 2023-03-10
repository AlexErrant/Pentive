import { Component, Show, Suspense } from "solid-js"
import ErrorBoundary, { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { Ord, RemoteNoteId, getNote } from "shared"
import ResizingIframe from "~/components/resizingIframe"

export function routeData({ params }: RouteDataArgs) {
  return {
    noteId: (): string => params.noteId,
    note: createServerData$(
      async (noteId) => await getNote(noteId as RemoteNoteId),
      { key: () => params.noteId }
    ),
  }
}

const Thread: Component = () => {
  const { note } = useRouteData<typeof routeData>()
  return (
    <ErrorBoundary fallback={() => <p>Error loading note.</p>}>
      <Suspense fallback={<p>Loading note...</p>}>
        <Show when={note()} fallback={<p>"404 Not Found"</p>}>
          <ResizingIframe
            i={{
              tag: "card",
              side: "front",
              template: note()!.template,
              ord: 0 as Ord,
              fieldsAndValues: Array.from(note()!.fieldValues.entries()),
            }}
          />
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}

export default Thread
