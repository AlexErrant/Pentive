import { Component, Show, Suspense } from "solid-js"
import { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { Base64Url, getPost } from "shared"

export function routeData({ params }: RouteDataArgs) {
  return {
    threadId: (): string => params.threadId,
    thread: createServerData$(
      async (threadId) => await getPost(threadId as Base64Url),
      { key: () => params.threadId }
    ),
  }
}

const Thread: Component = () => {
  const { thread } = useRouteData<typeof routeData>()
  return (
    <Suspense fallback={<p>Loading thread...</p>}>
      <Show when={thread()} fallback={<p>"404 Not Found"</p>}>
        <h1>{thread()!.title}</h1>
        <p>{thread()!.text}</p>
      </Show>
    </Suspense>
  )
}

export default Thread
