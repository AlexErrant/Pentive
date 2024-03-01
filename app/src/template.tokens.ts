/* Hand-written tokenizer for XML tag matching. */

import { ExternalTokenizer, ContextTracker } from '@lezer/lr'
import {
	StartTag,
	StartCloseTag,
	mismatchedStartCloseTag,
	incompleteStartCloseTag,
	MissingCloseTag,
	Element,
	OpenTag,
	commentContent as _commentContent,
	piContent as _piContent,
	cdataContent as _cdataContent,
} from './parser.terms.js'

function nameChar(ch) {
	return (
		ch == 45 ||
		ch == 46 ||
		ch == 58 ||
		(ch >= 65 && ch <= 90) ||
		ch == 95 ||
		(ch >= 97 && ch <= 122) ||
		ch >= 161
	)
}

function isSpace(ch) {
	return ch == 9 || ch == 10 || ch == 13 || ch == 32
}

let cachedName = null
let cachedInput = null
let cachedPos = 0
function tagNameAfter(input, offset) {
	const pos = input.pos + offset
	if (cachedInput == input && cachedPos == pos) return cachedName
	while (isSpace(input.peek(offset))) offset++
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

function ElementContext(name, parent) {
	this.name = name
	this.parent = parent
	this.hash = parent ? parent.hash : 0
	for (let i = 0; i < name.length; i++)
		this.hash +=
			(this.hash << 4) + name.charCodeAt(i) + (name.charCodeAt(i) << 8)
}

export const elementContext = new ContextTracker({
	start: null,
	shift(context, term, stack, input) {
		return term == StartTag
			? new ElementContext(tagNameAfter(input, 1) || '', context)
			: context
	},
	reduce(context, term) {
		return term == Element && context ? context.parent : context
	},
	reuse(context, node, _stack, input) {
		const type = node.type.id
		return type == StartTag || type == OpenTag
			? new ElementContext(tagNameAfter(input, 1) || '', context)
			: context
	},
	hash(context) {
		return context ? context.hash : 0
	},
	strict: false,
})

export const startTag = new ExternalTokenizer(
	(input, stack) => {
		if (input.next != 60 /* '<' */) return
		input.advance()
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
		} else if (input.next != 33 /* '!' */ && input.next != 63 /* '?' */) {
			input.acceptToken(StartTag)
		}
	},
	{ contextual: true },
)

function scanTo(type, end) {
	return new ExternalTokenizer((input) => {
		let len = 0
		const first = end.charCodeAt(0)
		scan: for (; ; input.advance(), len++) {
			if (input.next < 0) break
			if (input.next == first) {
				for (let i = 1; i < end.length; i++)
					if (input.peek(i) != end.charCodeAt(i)) continue scan
				break
			}
		}
		if (len) input.acceptToken(type)
	})
}

export const commentContent = scanTo(_commentContent, '-->')
export const piContent = scanTo(_piContent, '?>')
export const cdataContent = scanTo(_cdataContent, ']]>')
