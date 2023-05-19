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

export const Plugin: ParentComponent<{
  readonly name: string
  readonly attrs: Record<string, unknown>
}> = (props) => {
  // eslint-disable-next-line solid/reactivity -- props.name is not reactive
  const elementName = "pentive-" + props.name
  return (
    <Show when={registeredElements.has(elementName)} fallback={props.children}>
      <Dynamic component={elementName} {...kebabCaseKeys(props.attrs)} />
    </Show>
  )
}
