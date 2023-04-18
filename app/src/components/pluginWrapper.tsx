import { type ParentComponent, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import _ from "lodash"
import { registeredElements } from ".."

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
  readonly name: string
  readonly attrs: Record<string, unknown>
}> = (props) => {
  const attrs = kebabCaseKeys(props.attrs)
  const elementName = "pentive-" + props.name
  return (
    <Show when={registeredElements.has(elementName)} fallback={props.children}>
      <Dynamic component={elementName} {...attrs} />
    </Show>
  )
}
