import { type VoidComponent, For, Show, createResource } from "solid-js"
import { type Template, objEntries, type RemoteTemplateId } from "shared"
import { diffChars, diffCss, diffWords } from "diff"
import { cwaClient } from "../trpcClient"
import Diff from "./diff"

const TemplateSync: VoidComponent<{ template: Template }> = (props) => {
  return (
    <ul>
      <For each={objEntries(props.template.remotes)}>
        {([nookId, remoteTemplate]) => (
          <li>
            <h2>/n/{nookId}</h2>
            <Show when={remoteTemplate} fallback={`Not yet uploaded.`}>
              <TemplateNookSync
                template={props.template}
                remoteTemplate={remoteTemplate!}
              />
            </Show>
          </li>
        )}
      </For>
    </ul>
  )
}

export default TemplateSync

const TemplateNookSync: VoidComponent<{
  template: Template
  remoteTemplate: {
    remoteTemplateId: RemoteTemplateId
    uploadDate: Date
  }
}> = (props) => {
  const [remoteTemplate] = createResource(
    () => props.remoteTemplate.remoteTemplateId,
    async (id) => await cwaClient.getTemplate.query(id) // medTODO planetscale needs an id that associates all templates so we can lookup in 1 pass. Also would be useful to find "related" templates
  )
  return (
    <Show when={remoteTemplate()}>
      <Diff
        title="Name"
        changes={diffChars(remoteTemplate()!.name, props.template.name)}
      />
      <Diff
        title="Css"
        changes={diffCss(remoteTemplate()!.css, props.template.css)}
      />
      <Diff
        title="Fields"
        changes={diffWords(
          remoteTemplate()!.fields.join(", "),
          props.template.fields.map((f) => f.name).join(", ")
        )}
      />
    </Show>
  )
}
