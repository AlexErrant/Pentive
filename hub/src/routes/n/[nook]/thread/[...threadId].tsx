import { Component, Show } from "solid-js"
import { A, RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { Base64Url, Kysely } from "shared"

export function routeData({ params }: RouteDataArgs) {
  return {
    threadId: (): string => params.threadId,
    thread: createServerData$(
      async (threadId, { env }) => {
        return await new Kysely(env.planetscaleDbUrl).getPost(
          threadId as Base64Url
        )
      },
      { key: () => params.threadId }
    ),
  }
}

const Thread: Component = () => {
  const { thread } = useRouteData<typeof routeData>()
  return (
    <Show when={thread()}>
      <h1>{thread()!.title}</h1>
      {thread()!.text}
    </Show>
  )
}

export default Thread
