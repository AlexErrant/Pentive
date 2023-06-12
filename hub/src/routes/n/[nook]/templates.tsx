import { type Component, For, Show } from "solid-js"
import { type RouteDataArgs, useRouteData, A } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { type NookId, unproxify } from "shared"
import { getTemplates } from "shared-edge"
import ResizingIframe from "~/components/resizingIframe"
import { getAppMessenger } from "~/root"
import { remoteToTemplate } from "~/lib/utility"

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
  const { data, nook } = useRouteData<typeof routeData>()
  return (
    <>
      <Show when={data()}>
        <ul>
          <For each={data()!.templates}>
            {(template) => {
              const localTemplate = () => remoteToTemplate(template)
              return (
                <li>
                  <h1>{template.name}</h1>
                  <div>
                    <button
                      onClick={async () => {
                        await getAppMessenger().addTemplate(unproxify(template))
                      }}
                    >
                      Download
                    </button>
                  </div>
                  <ResizingIframe
                    i={{
                      tag: "template",
                      side: "front",
                      template: localTemplate(),
                      index: 0,
                    }}
                  />
                  <ResizingIframe
                    i={{
                      tag: "template",
                      side: "back",
                      template: localTemplate(),
                      index: 0,
                    }}
                  />
                  <A href={`/n/${nook()}/template/${template.id}/edit`}>Edit</A>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
    </>
  )
}

export default Threads
