import { onMount, type VoidComponent } from "solid-js"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser as PMDOMParser } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"
import "prosemirror-view/style/prosemirror.css"
import "prosemirror-menu/style/menu.css"
import "prosemirror-example-setup/style/style.css"

export const FieldEditor: VoidComponent<{
  readonly field: string
  readonly value: string
}> = (props) => {
  // Mix the nodes from prosemirror-schema-list into the basic schema to
  // create a schema with list support.
  const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks,
  })
  let editor: HTMLDivElement | undefined
  onMount(() => {
    const doc = new DOMParser().parseFromString(props.value, "text/html")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const editorView = new EditorView(editor!, {
      state: EditorState.create({
        doc: PMDOMParser.fromSchema(mySchema).parse(doc),
        plugins: exampleSetup({ schema: mySchema }),
      }),
    })
  })
  return (
    <>
      <div>{props.field}</div>
      <div>
        <div ref={editor}></div>
      </div>
    </>
  )
}
