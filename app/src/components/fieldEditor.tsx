import { onMount, type VoidComponent } from "solid-js"
import { EditorState, type Transaction } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import {
  DOMSerializer,
  Schema,
  DOMParser as ProseMirrorDOMParser,
  type NodeSpec,
} from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"
import "prosemirror-view/style/prosemirror.css"
import "prosemirror-menu/style/menu.css"
import "prosemirror-example-setup/style/style.css"
import { type MediaId } from "shared"
import { db } from "../db"
import { blobToBase64 } from "shared-dom"
import { type NoteCardView } from "../pages/cards"
import { type SetStoreFunction } from "solid-js/store"

// c.f. https://github.com/ProseMirror/prosemirror-schema-basic/blob/cbd834fed35ce70c56a42d387fe1c3109187935e/src/schema-basic.ts#LL74-L94
const imageSpec: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    srcx: {},
    alt: { default: null },
    title: { default: null },
  },
  group: "inline",
  draggable: true,
  parseDOM: [
    {
      tag: "img[src]",
      getAttrs(dom) {
        dom = dom as HTMLElement
        return {
          src: dom.getAttribute("src"),
          srcx: dom.getAttribute("srcx"),
          title: dom.getAttribute("title"),
          alt: dom.getAttribute("alt"),
        }
      },
    },
  ],
  toDOM(node) {
    return [
      "img",
      {
        src: node.attrs.src as string,
        srcx: node.attrs.srcx as string,
        alt: node.attrs.alt as string,
        title: node.attrs.title as string,
      },
    ]
  },
}
const imageSpecSerializer: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    srcx: {},
    alt: { default: null },
    title: { default: null },
  },
  group: "inline",
  draggable: true,
  parseDOM: [
    {
      tag: "img[src]",
      getAttrs(dom) {
        dom = dom as HTMLElement
        return {
          src: dom.getAttribute("src"),
          srcx: dom.getAttribute("srcx"),
          title: dom.getAttribute("title"),
          alt: dom.getAttribute("alt"),
        }
      },
    },
  ],
  toDOM(node) {
    return [
      "img",
      {
        src: node.attrs.srcx as string,
        alt: node.attrs.alt as string,
        title: node.attrs.title as string,
      },
    ]
  },
}

export const FieldEditor: VoidComponent<{
  readonly field: string
  readonly value: string
  readonly i: number
  readonly setNoteCard: SetStoreFunction<{
    selected?: NoteCardView
  }>
}> = (props) => {
  // Mix the nodes from prosemirror-schema-list into the basic schema to
  // create a schema with list support.
  const mySchema = new Schema({
    nodes: addListNodes(
      schema.spec.nodes,
      "paragraph block*",
      "block"
    ).addToEnd("image", imageSpec),
    marks: schema.spec.marks,
  })
  const mySchemaSerializer = new Schema({
    nodes: addListNodes(
      schema.spec.nodes,
      "paragraph block*",
      "block"
    ).addToEnd("image", imageSpecSerializer),
    marks: schema.spec.marks,
  })
  let editor: HTMLDivElement | undefined
  onMount(async () => {
    const doc = new DOMParser().parseFromString(props.value, "text/html")
    await Promise.all(Array.from(doc.images).map(updateImgSrc))
    const xmlSerializer = new XMLSerializer()
    const domSerializer = DOMSerializer.fromSchema(mySchemaSerializer)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- not sure wtf to do with editorView
    const editorView = new EditorView(editor!, {
      state: EditorState.create({
        doc: ProseMirrorDOMParser.fromSchema(mySchema).parse(doc),
        plugins: exampleSetup({ schema: mySchema }),
      }),
      dispatchTransaction(this: EditorView, tr: Transaction) {
        this.updateState(this.state.apply(tr))
        if (tr.docChanged) {
          const xml = domSerializer.serializeFragment(this.state.doc.content)
          props.setNoteCard(
            "selected",
            "note",
            "fieldValues",
            props.i,
            1,
            xmlSerializer.serializeToString(xml)
          )
        }
      },
    })
  })
  return (
    <>
      <div>{props.field}</div>
      <div>
        <div ref={editor} />
      </div>
    </>
  )
}

async function updateImgSrc(img: HTMLImageElement) {
  const src = img.getAttribute("src")
  if (src == null || src === "" || src.startsWith("http")) {
    // do nothing
  } else {
    const media = await db.getMedia(src as MediaId)
    if (media == null) return
    const type = src.endsWith(".svg") ? "image/svg+xml" : "image"
    const blob = new Blob([media.data], { type })
    const dataUrl = await blobToBase64(blob)
    img.setAttribute("src", dataUrl)
    img.setAttribute("srcx", src)
  }
}
