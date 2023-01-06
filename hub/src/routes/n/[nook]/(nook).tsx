import { Component, For, Show, JSX } from "solid-js"
import { A, RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { Kysely } from "shared"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: (): string => params.nook,
    posts: createServerData$(
      async (nook, { env }) => {
        return await new Kysely(env.planetscaleDbUrl).getPost({ nook })
      },
      { key: () => params.nook }
    ),
  }
}

const Threads: Component = () => {
  const { posts } = useRouteData<typeof routeData>()
  return (
    <>
      <Show when={posts()}>
        <ul>
          <For each={posts()}>
            {(post): JSX.Element => (
              <li>
                <A href={post.id}>{post.title}</A>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}

export default Threads
