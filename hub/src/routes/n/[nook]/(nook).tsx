import { Component, For, Show } from "solid-js"
import { A, RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { getPosts, getNotes, NookId, Ord } from "shared"
import ResizingIframe from "~/components/resizingIframe"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: () => params.nook,
    data: createServerData$(
      async (nook) => {
        return {
          posts: await getPosts({ nook }),
          notes: await getNotes(nook as NookId),
        }
      },
      { key: () => params.nook }
    ),
  }
}

const Threads: Component = () => {
  const { data, nook } = useRouteData<typeof routeData>()
  return (
    <>
      <a href={`/n/${nook()}/templates`}>Templates</a>
      <Show when={data()}>
        <ul>
          <For each={data()!.posts}>
            {(post) => (
              <li>
                <A href={`thread/${post.id}`}>{post.title}</A>
              </li>
            )}
          </For>
          <For each={data()!.notes}>
            {(note) => (
              <li>
                <div>{note.subscribers} subscribers</div>
                <div>
                  <a href={`/n/${nook()}/note/${note.id}`}>
                    {note.comments} comments
                  </a>
                </div>
                <ResizingIframe
                  i={{
                    tag: "card",
                    side: "front",
                    template: note.template,
                    ord: 0 as Ord,
                    fieldsAndValues: Array.from(note.fieldValues.entries()),
                  }}
                />
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}

export default Threads
