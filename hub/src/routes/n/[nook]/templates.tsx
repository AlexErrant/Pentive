import { type Component, For, Show } from "solid-js"
import { type RouteDataArgs, useRouteData, A } from "solid-start"
import { createServerData$ } from "solid-start/server"
import { type NookId } from "shared"
import { getTemplates } from "shared-edge"
import ResizingIframe from "~/components/resizingIframe"
import { getAppMessenger } from "~/root"
import { remoteToTemplate } from "~/lib/utility"
import { unwrap } from "solid-js/store"
import { getUserId } from "~/session"
import { cwaClient } from "app/src/trpcClient"

export function routeData({ params }: RouteDataArgs) {
  return {
    nook: () => params.nook,
    data: createServerData$(
      async (nook, { request }) => {
        const userId = (await getUserId(request)) ?? undefined
        return {
          templates: await getTemplates(nook as NookId, userId),
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
                        await getAppMessenger().addTemplate(unwrap(template))
                        await cwaClient.subscribeToTemplate.mutate(template.id)
                      }}
                      disabled={template.til != null}
                    >
                      Download
                    </button>
                    <div>
                      {template.til == null
                        ? ""
                        : "Last synced at" + template.til.toLocaleTimeString()}
                    </div>
                    <a href={`/n/${nook()}/template/${template.id}`}>
                      Comments: {template.comments}
                    </a>
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
