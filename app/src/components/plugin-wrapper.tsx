import { ParentComponent, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { config } from "./../plugin-manager"

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Plugin: ParentComponent<{ name: string }> = (props) => {
  const name = "pentive-" + props.name
  return (
    <Show when={config[name]} fallback={props.children}>
      <Dynamic component={name} />
    </Show>
  )
}
