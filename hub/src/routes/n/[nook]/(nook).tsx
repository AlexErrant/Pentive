import { type Component, For, Show } from "solid-js"
import { A, type RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { getPosts, getNotes, type NookId, type Ord } from "shared"
import ResizingIframe from "~/components/resizingIframe"
import { getUserId } from "~/session"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: () => params.nook,
    data: createServerData$(
      async (nook, { request }) => {
        return {
          posts: await getPosts({ nook }),
          notes: await getUserId(request).then(
            async (userId) => await getNotes(nook as NookId, userId)
          ),
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
      <A href={`/n/${nook()}/templates`}>Templates</A>
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
                <div>
                  Til {note.til == null ? "X" : note.til.toLocaleTimeString()}
                </div>
                <div>{note.subscribers} subscribers</div>
                <div>
                  {/* making this an <A> breaks because maps (e.g. `note.fieldValues`) aren't JSON serializable. Revisit if this issue is ever resolved. https://github.com/TanStack/bling/issues/9 */}
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
