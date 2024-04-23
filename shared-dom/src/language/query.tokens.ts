import { ExternalTokenizer, ContextTracker, type Stack } from '@lezer/lr'
import { kind, Label, KindValue } from './queryParser.terms'

class ElementContext {
	name: number
	parent: ElementContext | null
	hash: number
	constructor(name: number, parent: ElementContext | null) {
		this.name = name
		this.parent = parent
		this.hash = parent != null ? parent.hash : 0
		this.hash += (this.hash << 4) + name + (name << 8)
	}
}

export const labelContext = new ContextTracker<null | ElementContext>({
	start: null,
	shift(context, term, _stack, _input) {
		return term === kind ? new ElementContext(kind, context) : context
	},
	reduce(context, term) {
		return term === Label && context != null ? context.parent : context
	},
	hash(context) {
		return context != null ? context.hash : 0
	},
	strict: false,
})

export const labelValue = new ExternalTokenizer(
	(input, stack0) => {
		const stack = stack0 as Omit<Stack, 'context'> & {
			context: ElementContext | null
		}
		if (stack.context?.name === kind) {
			if (
				input.peek(0) === 110 &&
				input.peek(1) === 101 &&
				input.peek(2) === 119 // new
			) {
				input.acceptToken(KindValue, 3)
			} else if (
				input.peek(0) === 108 &&
				input.peek(1) === 101 &&
				input.peek(2) === 97 &&
				input.peek(3) === 114 &&
				input.peek(4) === 110 // learn
			) {
				input.acceptToken(KindValue, 5)
			} else if (
				input.peek(0) === 114 &&
				input.peek(1) === 101 &&
				input.peek(2) === 118 &&
				input.peek(3) === 105 &&
				input.peek(4) === 101 &&
				input.peek(5) === 119 // review
			) {
				input.acceptToken(KindValue, 6)
			} else if (
				input.peek(0) === 114 &&
				input.peek(1) === 101 &&
				input.peek(2) === 108 &&
				input.peek(3) === 101 &&
				input.peek(4) === 97 &&
				input.peek(5) === 114 &&
				input.peek(6) === 110 // relearn
			) {
				input.acceptToken(KindValue, 7)
			} else if (
				input.peek(0) === 99 &&
				input.peek(1) === 114 &&
				input.peek(2) === 97 &&
				input.peek(3) === 109 // cram
			) {
				input.acceptToken(KindValue, 4)
			}
		}
	},
	{ contextual: true },
)
