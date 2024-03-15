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

// make a DU if there's a second
export interface Error {
	tag: 'SyntaxError'
	errorParent: string
}

// make a DU if there's a second
export interface Warning {
	tag: 'Transformer404'
	transformer: string
}

class Context {
	constructor() {
		this.html = ''
		this.hideTagName = null
		this.warnings = []
	}

	html: string
	hideTagName: string | null
	warnings: Warning[]
}

export function validate(this: RenderContainer, input: string) {
	const tree = parser.parse(input)
	const errors: Error[] = []
	tree.cursor().iterate((node) => {
		if (node.type.isError) {
			const parent = node.node.parent
			const from = parent?.from
			const to = parent?.to == null ? undefined : parent.to + 1 // +1 to include what might be an unexpected character
			errors.push({
				tag: 'SyntaxError',
				errorParent: input.slice(from, to),
			})
			return false
		}
	})
	return errors.length === 0 ? tree : errors
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
	return { html: context.html.trim(), warnings: context.warnings }
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
					context.warnings.push({
						tag: 'Transformer404',
						transformer: transformerName,
					})
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
