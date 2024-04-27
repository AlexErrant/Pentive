import { ExternalTokenizer, type InputStream } from '@lezer/lr'
import { RawStringLiteral, RawHtmlLiteral } from './queryParser.terms'

export const rawStringLiteral = new ExternalTokenizer(
	(input) => {
		let i = rawLiteral(input, 34)
		if (i !== 0) {
			input.acceptToken(RawStringLiteral, i)
			return
		}
		i = rawLiteral(input, 39)
		if (i !== 0) {
			input.acceptToken(RawStringLiteral, i)
		}
	},
	{
		contextual: true,
	},
)

export const rawHtmlLiteral = new ExternalTokenizer(
	(input) => {
		const i = rawLiteral(input, 96)
		if (i !== 0) {
			input.acceptToken(RawHtmlLiteral, i)
		}
	},
	{
		contextual: true,
	},
)

function rawLiteral(input: InputStream, delimiter: number) {
	let i = 0
	while (input.peek(i) === delimiter) {
		i++
	}
	if (i <= 2) return 0
	const quoteCount = i
	let endingQuoteCount = 0
	while (endingQuoteCount !== quoteCount) {
		const current = input.peek(i)
		if (current === -1) return 0
		if (current === delimiter) {
			endingQuoteCount++
		} else if (endingQuoteCount !== 0) {
			endingQuoteCount = 0
		}
		i++
	}
	return i
}
