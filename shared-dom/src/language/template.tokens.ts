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
		ch >= 0 && // .peek() may return -1 or NaN
		ch != 35 && // #
		ch != 58 && // :
		ch != 94 && // ^
		ch != 125 //   }
	)
}

// if you update this, also update 08643083-B4CC-42E8-ACFA-A713DF287B7F
// this fn's 2 callers don't call this with the same semantics, but whatever
// 1. looks for the rest of the acceptable chars in a tag name
// 2. looks for anything after the {{ token, which could include # and ^
function nameChar2(ch: number) {
	return (
		ch >= 0 && // .peek() may return -1 or NaN
		ch != 58 && // :
		ch != 125 //   }
	)
}

let cachedName: null | string = null
let cachedInput: null | InputStream = null
let cachedPos = 0
function tagNameAfter(input: InputStream, offset: number) {
	const pos = input.pos + offset
	if (cachedInput == input && cachedPos == pos) return cachedName
	let name = ''
	const firstChar = input.peek(offset)
	if (nameChar(firstChar)) {
		name += String.fromCharCode(firstChar)
		offset++
		for (;;) {
			const next = input.peek(offset)
			if (!nameChar2(next)) break
			name += String.fromCharCode(next)
			offset++
		}
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (input.next != 123 /* '{' */) return
		input.advance()
		// @ts-expect-error .advance changes the .next value but TS doesn't know that
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
		} else if (nameChar2(input.next)) {
			input.acceptToken(StartTag)
		}
	},
	{ contextual: true },
)
