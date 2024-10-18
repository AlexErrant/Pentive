import { type Tree, type SyntaxNodeRef } from '@lezer/common'
import { parser } from './templateParser'

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
import { isEqual, uniqWith } from 'lodash-es'
import { type Card } from 'shared/domain/card'
import { type Note } from 'shared/domain/note'
import { type Template } from 'shared/domain/template'

// make a DU if there's a second Error
export interface Error {
	tag: 'SyntaxError'
	errorParent: string
}

// make a DU if there's a second Warning
export interface Warning {
	tag: 'Transformer404'
	transformer: string
}

class Context {
	constructor() {
		this.html = ''
		this.hideTagName = null
		this.warnings = []
		this.hasContent = false
	}

	html: string
	hideTagName: string | null
	hasContent: boolean // used to return empty string when there's no content, e.g. when Field is empty and the template is <div>{{#Field}}{{Field}}{{/Field}}</div> like at grep 541E2B56-BC18-48B1-9CC8-6A731A97CD03
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
	return errors.length === 0 ? tree : uniqWith(errors, (x, y) => isEqual(x, y))
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
	return {
		html: context.hasContent ? context.html.trim() : '', // grep 541E2B56-BC18-48B1-9CC8-6A731A97CD03
		warnings: context.warnings,
	}
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
			if (!isEmpty(value)) {
				context.html += value
				context.hasContent = true
			}
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
