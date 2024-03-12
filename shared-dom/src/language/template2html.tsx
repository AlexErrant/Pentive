import { type Tree, type SyntaxNodeRef } from '@lezer/common'
import { parser } from './templateParser'
import { type Card, type Note, type Template } from 'shared'

import {
	StartTag,
	StartCloseTag,
	OpenTag,
	If,
	SelfClosingTag,
	Text,
	TagName,
	Transformer,
	Brace,
} from './templateParser.terms'
import { type RenderContainer } from '../renderContainer'

class Context {
	constructor() {
		this.html = ''
		this.hideTagName = null
	}

	html: string
	hideTagName: string | null
}

export function validate(this: RenderContainer, input: string) {
	const tree = parser.parse(input)
	let hasErrors = false
	tree.cursor().iterate((node) => {
		// eslint-disable-next-line solid/reactivity
		if (node.type.isError) {
			// eslint-disable-next-line solid/reactivity
			const parent = node.node.parent
			const from = parent?.from
			const to = parent?.to == null ? undefined : parent.to + 1 // +1 to include what might be an unexpected character
			this.toastError(
				<>
					There's a syntax error in the template near{' '}
					<pre>{input.slice(from, to)}</pre>
				</>,
			)
			hasErrors = true
			return false
		}
	})
	return hasErrors ? null : tree
}

export function convert(
	this: RenderContainer,
	input: string,
	tree: Tree,
	isFront: boolean,
	card: Card,
	note: Note,
	template: Template,
) {
	const context = new Context()
	tree.cursor().iterate(
		(node) => {
			astEnter.bind(this)(input, node, context, isFront, card, note, template)
		},
		(node) => {
			astLeave(input, node, context)
		},
	)
	return context.html.trim()
}

function isEmpty(input: string | null | undefined) {
	if (input == null) return true
	return input.trim() === ''
}

function htmlifyTags(tags: Set<string>) {
	return Array.from(tags.keys()).join(', ')
}

function astEnter(
	this: RenderContainer,
	input: string,
	node: SyntaxNodeRef,
	context: Context,
	isFront: boolean,
	card: Card,
	note: Note,
	template: Template,
) {
	if (context.hideTagName != null) return
	if (node.type.is(Text) || node.node.type.is(Brace)) {
		context.html += input.slice(node.from, node.to)
	} else if (node.node.type.is(SelfClosingTag)) {
		const fieldNode = node.node.getChildren(TagName)[0]!
		const field = input.slice(fieldNode.from, fieldNode.to)
		let value =
			note.fieldValues.get(field)?.trim() ??
			new Map([['Tags', htmlifyTags(note.tags)]]).get(field)
		if (value == null) {
			context.html += input.slice(node.from, node.to)
		} else {
			const transformerNames = node.node
				.getChildren(Transformer)
				.map((t) => input.slice(t.from, t.to - 1))
				.filter((x) => x.length !== 0)
			for (const transformerName of transformerNames) {
				const transformer = this.transformers.get(transformerName)
				if (transformer == null) {
					this.toastWarn(
						<>
							Transformer <pre>{transformerName}</pre> not found.
						</>,
					)
					continue
				}
				value = transformer.bind(this)({
					initialValue: value,
					isFront,
					card,
					note,
					template,
				})
			}
			context.html += value
		}
	} else if (
		node.type.is(StartTag) &&
		node.node.parent?.type.is(OpenTag) === true
	) {
		const tagNameNode = node.node.nextSibling!.nextSibling!
		const field = input.slice(tagNameNode.from, tagNameNode.to)
		const value =
			field === 'Tags'
				? htmlifyTags(note.tags).trim()
				: note.fieldValues.get(field)?.trim()
		if (node.node.nextSibling?.type.is(If) === true) {
			if (isEmpty(value)) {
				context.hideTagName = field
			}
		} else {
			if (!isEmpty(value)) {
				context.hideTagName = field
			}
		}
	}
}

function astLeave(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.is(StartCloseTag)) {
		const tagNameNode = node.node.nextSibling!
		const field = input.slice(tagNameNode.from, tagNameNode.to)
		if (context.hideTagName === field) {
			context.hideTagName = null
		}
	}
}
