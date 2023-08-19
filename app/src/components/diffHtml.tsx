import { type VoidComponent, Show } from "solid-js"
import ResizingIframe from "./resizingIframe"
import diffHtml from "node-htmldiff"

const DiffHtml: VoidComponent<{
  before: string
  after: string
  css: string
  title: string
}> = (props) => (
  <div class="border border-black p-1 m-2">
    <h3>
      {props.title}
      <Show when={props.before === props.after}>
        {" "}
        - <em>No changes</em>
      </Show>
    </h3>
    <ResizingIframe
      i={{
        tag: "raw",
        html: diffHtml(props.before, props.after),
        css: props.css + "ins{background:palegreen}del{background:pink}",
      }}
    />
  </div>
)

export default DiffHtml
