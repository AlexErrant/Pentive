import { parser } from './templateParser'
import { SelfClosingTag, TagName, Transformer } from './templateParser.terms'
import { type RenderContainer } from '../renderContainer'

// for `renderTemplate`'s usage only because it doesn't check for the existence of `field` in the note's fieldValues
export function getClozeFields(this: RenderContainer, frontTemplate: string) {
	const clozeFieldNames: string[] = []
	const tree = parser.parse(frontTemplate)
	tree.cursor().iterate((node) => {
		if (node.node.type.is(SelfClosingTag)) {
			const isCloze = node.node
				.getChildren(Transformer)
				.map((t) => frontTemplate.slice(t.from, t.to - 1))
				.includes('cloze')
			if (isCloze) {
				const fieldNode = node.node.getChildren(TagName)[0]!
				const field = frontTemplate.slice(fieldNode.from, fieldNode.to)
				clozeFieldNames.push(field)
			}
		}
	})
	return clozeFieldNames
}
