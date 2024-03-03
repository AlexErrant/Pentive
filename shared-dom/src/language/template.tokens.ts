/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable eqeqeq */

/* Mostly a copy/paste of https://github.com/lezer-parser/xml */

import {
	ExternalTokenizer,
	ContextTracker,
	type InputStream,
	type Stack,
} from '@lezer/lr'
import {
	StartTag,
	StartCloseTag,
	mismatchedStartCloseTag,
	incompleteStartCloseTag,
	MissingCloseTag,
	Element,
	OpenTag,
} from './templateParser.terms'

// if you update this, also update 08643083-B4CC-42E8-ACFA-A713DF287B7F
function nameChar(ch: number) {
	return (
		ch == 32 || // space
		(ch >= 48 && ch <= 57) || // 0-9
		(ch >= 65 && ch <= 90) || // A-Z
		(ch >= 97 && ch <= 122) // a-z
	)
}

let cachedName: null | string = null
let cachedInput: null | InputStream = null
let cachedPos = 0
function tagNameAfter(input: InputStream, offset: number) {
	const pos = input.pos + offset
	if (cachedInput == input && cachedPos == pos) return cachedName
	let name = ''
	for (;;) {
		const next = input.peek(offset)
		if (!nameChar(next)) break
		name += String.fromCharCode(next)
		offset++
	}
	cachedInput = input
	cachedPos = pos
	return (cachedName = name || null)
}

class ElementContext {
	name: string
	parent: ElementContext | null
	hash: number
	constructor(name: string, parent: ElementContext | null) {
		this.name = name
		this.parent = parent
		this.hash = parent ? parent.hash : 0
		for (let i = 0; i < name.length; i++)
			this.hash +=
				(this.hash << 4) + name.charCodeAt(i) + (name.charCodeAt(i) << 8)
	}
}

export const elementContext = new ContextTracker<null | ElementContext>({
	start: null,
	shift(context, term, _stack, input) {
		return term == StartTag
			? new ElementContext(tagNameAfter(input, 3) || '', context)
			: context
	},
	reduce(context, term) {
		return term == Element && context ? context.parent : context
	},
	reuse(context, node, _stack, input) {
		const type = node.type.id
		return type == StartTag || type == OpenTag
			? new ElementContext(tagNameAfter(input, 3) || '', context)
			: context
	},
	hash(context) {
		return context ? context.hash : 0
	},
	strict: false,
})

export const startTag = new ExternalTokenizer(
	(input, stack0) => {
		const stack = stack0 as Omit<Stack, 'context'> & {
			context: ElementContext | null
		}
		if (input.next != 123 /* '{' */) return
		input.advance()
		if (input.next != 123 /* '{' */) return
		input.advance()
		// @ts-expect-error .advance changes the .next value but TS doesn't know that
		if (input.next == 47 /* '/' */) {
			input.advance()
			const name = tagNameAfter(input, 0)
			if (!name) {
				input.acceptToken(incompleteStartCloseTag)
				return
			}
			if (stack.context && name == stack.context.name) {
				input.acceptToken(StartCloseTag)
				return
			}
			for (let cx = stack.context; cx; cx = cx.parent)
				if (cx.name == name) {
					input.acceptToken(MissingCloseTag, -2)
					return
				}
			input.acceptToken(mismatchedStartCloseTag)
			// @ts-expect-error .advance changes the .next value but TS doesn't know that
		} else if (input.next != 33 /* '!' */ && input.next != 63 /* '?' */) {
			input.acceptToken(StartTag)
		}
	},
	{ contextual: true },
)
