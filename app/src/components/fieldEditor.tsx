import { onMount, type VoidComponent } from 'solid-js'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import {
	DOMSerializer,
	Schema,
	DOMParser as ProseMirrorDOMParser,
	type Node,
} from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { exampleSetup } from 'prosemirror-example-setup'
import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import { toOneLine, type MediaId } from 'shared'
import { db } from '../db'
import { type SetStoreFunction } from 'solid-js/store'
import { type ImagePluginSettings } from 'prosemirror-image-plugin'
import {
	defaultSettings as imageSettings,
	imagePlugin,
} from 'prosemirror-image-plugin'
import 'prosemirror-image-plugin/src/styles/common.css'
import 'prosemirror-image-plugin/src/styles/withResize.css'
import { type NoteCardView } from '../uiLogic/cards'
// import "prosemirror-image-plugin/src/styles/sideResize.css"

// cf. https://gitlab.com/emergence-engineering/prosemirror-image-plugin/-/blob/master/src/updateImageNode.ts
const updateImageNode = (
	type: 'serializer' | 'editor',
	nodes: Schema['spec']['nodes'],
	// Additional attributes where the keys are attribute names and values are default values
	pluginSettings: ImagePluginSettings,
): typeof nodes => {
	const { extraAttributes } = pluginSettings
	const attributesUpdate = Object.keys(extraAttributes)
		.map((attrKey) => ({
			[attrKey]: {
				default: extraAttributes[attrKey] ?? null,
			},
		}))
		.reduce((acc, curr) => ({ ...acc, ...curr }), {})

	const attributeKeys = [...Object.keys(extraAttributes), 'src', 'alt']
	return nodes.update('image', {
		...(pluginSettings.hasTitle ? { content: 'inline*' } : {}),
		attrs: {
			src: { default: null },
			alt: { default: null },
			height: { default: null },
			width: { default: null },
			maxWidth: { default: null },
			srcx: { default: null },
			title: { default: null },
			...attributesUpdate,
		},
		atom: true,
		...(pluginSettings.isBlock
			? { group: 'block' }
			: { group: 'inline', inline: true }),
		draggable: true,
		toDOM(node: Node) {
			if (type === 'serializer') {
				const toAttributes = Object.fromEntries(
					attributeKeys.map((attrKey) =>
						attrKey === 'src'
							? [attrKey, node.attrs.srcx ?? node.attrs[attrKey]]
							: [attrKey, node.attrs[attrKey] as unknown],
					),
				)
				return ['img', toAttributes]
			}
			const entries = attributeKeys.map((attrKey) => [
				`imageplugin-${attrKey}`,
				node.attrs[attrKey] as unknown,
			])
			entries.push(['class', 'imagePluginRoot'])
			const toAttributes = Object.fromEntries(entries) as unknown
			return ['div', toAttributes, ...(pluginSettings.hasTitle ? [0] : [])]
		},
		parseDOM: [
			{
				tag: 'img[src]',
				getAttrs(dom) {
					dom = dom as HTMLElement
					return {
						src: dom.getAttribute('src'),
						srcx: dom.getAttribute('srcx'),
						title: dom.getAttribute('title'),
						alt: dom.getAttribute('alt'),
					}
				},
			},
			{
				tag: 'div.imagePluginRoot',
				getAttrs(dom) {
					if (typeof dom === 'string') return {}
					return (
						attributeKeys
							.map((attrKey) => ({
								[attrKey]: dom.getAttribute(`imageplugin-${attrKey}`),
							}))
							// merge
							.reduce((acc, curr) => ({ ...acc, ...curr }), {})
					)
				},
			},
		],
	})
}

function makeSchema(type: 'serializer' | 'editor') {
	// c.f. https://github.com/ProseMirror/prosemirror-schema-basic/blob/cbd834fed35ce70c56a42d387fe1c3109187935e/src/schema-basic.ts#LL74-L94
	// Mix the nodes from prosemirror-schema-list into the basic schema to
	// create a schema with list support.
	const nodes1 = addListNodes(schema.spec.nodes, 'paragraph block*', 'block')
	return new Schema({
		nodes: updateImageNode(type, nodes1, imageSettings),
		marks: schema.spec.marks,
	})
}

const mySchema = makeSchema('editor')
const mySchemaSerializer = makeSchema('serializer')

const domSerializer = DOMSerializer.fromSchema(mySchemaSerializer)
const domParser = new DOMParser()
const proseMirrorDOMParser = ProseMirrorDOMParser.fromSchema(mySchema)

export const FieldEditor: VoidComponent<{
	readonly field: string
	readonly value: string
	readonly i: number
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
}> = (props) => {
	let editor: HTMLDivElement | undefined
	onMount(async () => {
		const doc = domParser.parseFromString(props.value, 'text/html')
		await Promise.all(Array.from(doc.images).map(updateImgSrc))
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- not sure wtf to do with editorView
		const editorView = new EditorView(editor!, {
			state: EditorState.create({
				doc: proseMirrorDOMParser.parse(doc),
				plugins: [
					...exampleSetup({ schema: mySchema }),
					imagePlugin(imageSettings),
				],
			}),
			dispatchTransaction(this: EditorView, tr) {
				this.updateState(this.state.apply(tr))
				if (tr.docChanged) {
					const div = document.createElement('div')
					div.appendChild(
						domSerializer.serializeFragment(this.state.doc.content),
					) // https://stackoverflow.com/a/51461773
					const value =
						toOneLine(div.innerHTML) === ''
							? ''
							: div.childNodes.length === 1 &&
								  div.childNodes[0]!.nodeName === 'P' &&
								  (div.childNodes[0] as HTMLParagraphElement).attributes
										.length === 0
								? (div.childNodes[0] as HTMLParagraphElement).innerHTML
								: div.innerHTML
					props.setNoteCard(
						'noteCard',
						'note',
						'fieldValues',
						props.i,
						1,
						value,
					)
				}
			},
		})
	})
	return <div ref={editor} />
}

/*
  Displaying the field's value verbatim doesn't display images in ProseMirror because the src won't resolve.
  Images are stored in the database, after all. There are a few solutions to this:
  
  1. Prefix all <img> srcs with a well known value (`ugm/` - "user generated media") and use app's service worker to intercept all `ugm/` requests
  2. Put ProseMirror in an iframe and give it a dedicated service worker, similar to app-ugc
     Cons: Complexity with iframe sizing.
  3. Rewrite all <img> srcs to use data URLs for display and convert back to the standard URL upon persistance
     Cons: When ProseMirror sets an <img> src attribute in `serializeFragment`, it makes a network request, filling console with 404s.
           Also can't use browser's cache, so we hit sqlite more.

  I'm going with Option 1.
*/
async function updateImgSrc(img: HTMLImageElement) {
	const src = img.getAttribute('src')
	if (
		src == null ||
		src === '' ||
		src.startsWith('http://') ||
		src.startsWith('https://')
	) {
		// do nothing
	} else {
		const media = await db.getMedia(src as MediaId)
		if (media == null) return
		img.setAttribute('src', 'ugm/' + src)
		img.setAttribute('srcx', src)
	}
}
