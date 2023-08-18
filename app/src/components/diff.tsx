import { type VoidComponent, For, Show } from "solid-js"
import { type Change } from "diff"

const Diff: VoidComponent<{
  changes: Change[]
  title: string
}> = (props) => (
  <div class="border border-black p-1 m-1">
    <h3>
      {props.title}
      <Show
        when={
          props.changes.length === 1 &&
          props.changes[0].added !== true &&
          props.changes[0].removed !== true
        }
      >
        {" "}
        - <em>No changes</em>
      </Show>
    </h3>
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
  </div>
)

export default Diff
