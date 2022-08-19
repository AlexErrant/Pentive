import { ParentComponent, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { config } from "./../plugin-manager"
import _ from "lodash"

// Due to
//     "Props get assigned as element properties and hyphenated attributes."
//     https://github.com/solidjs/solid/blob/main/packages/solid-element/README.md#custom-elements
// we need to hyphenate the names of props/attributes.
function kebabCaseKeys(x: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(x).reduce<Record<string, unknown>>(
    (accumulator, [k, v]) => {
      accumulator[_.kebabCase(k)] = v
      return accumulator
    },
    {}
  )
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Plugin: ParentComponent<{
  name: string
  attrs: Record<string, unknown>
}> = (props) => {
  const attrs = kebabCaseKeys(props.attrs)
  const name = "pentive-" + props.name
  return (
    <Show when={config[name]} fallback={props.children}>
      <Dynamic component={name} {...attrs} />
    </Show>
  )
}
