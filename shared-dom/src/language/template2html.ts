import { type SyntaxNodeRef } from '@lezer/common'
import { parser } from './templateParser'
import { type Card, type Note, type Template } from 'shared'

import {
	StartTag,
	StartCloseTag,
	OpenTag,
	If,
	SelfClosingTag,
	Text,
} from './templateParser.terms'

class Context {
	constructor() {
		this.html = ''
		this.hideTagName = null
	}

	html: string
	hideTagName: string | null
}

export function convert(
	input: string,
	isFront: boolean,
	card: Card,
	note: Note,
	template: Template,
) {
	const tree = parser.parse(input)
	const context = new Context()
	tree.cursor().iterate(
		(node) => {
			astEnter(input, node, context, isFront, card, note, template)
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

function astEnter(
	input: string,
	node: SyntaxNodeRef,
	context: Context,
	isFront: boolean,
	card: Card,
	note: Note,
	template: Template,
) {
	if (node.type.isError || context.hideTagName != null) return
	if (node.type.is(Text)) {
		context.html += input.slice(node.from, node.to)
	} else if (node.node.type.is(SelfClosingTag)) {
		context.html += input.slice(node.from, node.to) // todoNEXT
	} else if (
		node.type.is(StartTag) &&
		node.node.parent?.type.is(OpenTag) === true
	) {
		const tagNameNode = node.node.nextSibling!.nextSibling!
		const field = input.slice(tagNameNode.from, tagNameNode.to)
		const value =
			field === 'Tags'
				? Array.from(note.tags.keys()).join(', ')
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
