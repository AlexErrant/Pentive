import { type VoidComponent, For } from "solid-js"
import { type Change } from "diff"

const Diff: VoidComponent<{
  changes: Change[]
}> = (props) => (
  <For each={props.changes}>
    {({ added, removed, value }) => (
      <span
        class={
          added === true
            ? "text-green-500"
            : removed === true
            ? "text-red-500"
            : ""
        }
      >
        {value}
      </span>
    )}
  </For>
)

export default Diff
