import { Component, For, Show, JSX } from "solid-js"
import { A, RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { getPosts } from "shared"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: (): string => params.nook,
    posts: createServerData$(
      async (nook) => {
        return await getPosts({ nook })
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
                <A href={`thread/${post.id}`}>{post.title}</A>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}

export default Threads
