import { Component, For, Show } from "solid-js"
import { RouteDataArgs, useRouteData } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { NookId, getTemplates } from "shared"
import ResizingIframe from "~/components/resizingIframe"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: () => params.nook,
    data: createServerData$(
      async (nook) => {
        return {
          templates: await getTemplates(nook as NookId),
        }
      },
      { key: () => params.nook }
    ),
  }
}

const Threads: Component = () => {
  const { data } = useRouteData<typeof routeData>()
  return (
    <>
      <Show when={data()}>
        <ul>
          <For each={data()!.templates}>
            {(template) => (
              <li>
                <h1>{template.name}</h1>
                <ResizingIframe
                  i={{
                    tag: "template",
                    side: "front",
                    template,
                    index: 0,
                  }}
                />
                <ResizingIframe
                  i={{
                    tag: "template",
                    side: "back",
                    template,
                    index: 0,
                  }}
                />
                <a href={`./template/${template.id}/edit`}>Edit</a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  )
}

export default Threads
