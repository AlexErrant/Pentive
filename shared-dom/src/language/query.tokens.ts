import { ExternalTokenizer, type InputStream } from '@lezer/lr'
import {
	FieldValueEnum,
	KindEnum,
	StateEnum,
	RawStringLiteral,
	RawHtmlLiteral,
	RatingEnum,
} from './queryParser.terms'

export const kindEnum = new ExternalTokenizer(
	(input) => {
		if (
			input.peek(0) === 110 &&
			input.peek(1) === 101 &&
			input.peek(2) === 119 // new
		) {
			input.acceptToken(KindEnum, 3)
		} else if (
			input.peek(0) === 108 &&
			input.peek(1) === 101 &&
			input.peek(2) === 97 &&
			input.peek(3) === 114 &&
			input.peek(4) === 110 // learn
		) {
			input.acceptToken(KindEnum, 5)
		} else if (
			input.peek(0) === 114 &&
			input.peek(1) === 101 &&
			input.peek(2) === 118 &&
			input.peek(3) === 105 &&
			input.peek(4) === 101 &&
			input.peek(5) === 119 // review
		) {
			input.acceptToken(KindEnum, 6)
		} else if (
			input.peek(0) === 114 &&
			input.peek(1) === 101 &&
			input.peek(2) === 108 &&
			input.peek(3) === 101 &&
			input.peek(4) === 97 &&
			input.peek(5) === 114 &&
			input.peek(6) === 110 // relearn
		) {
			input.acceptToken(KindEnum, 7)
		} else if (
			input.peek(0) === 99 &&
			input.peek(1) === 114 &&
			input.peek(2) === 97 &&
			input.peek(3) === 109 // cram
		) {
			input.acceptToken(KindEnum, 4)
		}
	},
	{ contextual: true },
)

export const stateEnum = new ExternalTokenizer(
	(input) => {
		if (
			input.peek(0) === 110 &&
			input.peek(1) === 111 &&
			input.peek(2) === 114 &&
			input.peek(3) === 109 &&
			input.peek(4) === 97 &&
			input.peek(5) === 108 // normal
		) {
			input.acceptToken(StateEnum, 6)
		} else if (
			input.peek(0) === 98 &&
			input.peek(1) === 117 &&
			input.peek(2) === 114 &&
			input.peek(3) === 105 &&
			input.peek(4) === 101 &&
			input.peek(5) === 100 // buried
		) {
			input.acceptToken(StateEnum, 6)
		} else if (
			input.peek(0) === 117 &&
			input.peek(1) === 115 &&
			input.peek(2) === 101 &&
			input.peek(3) === 114 &&
			(input.peek(4) === 66 || input.peek(4) === 98) &&
			input.peek(5) === 117 &&
			input.peek(6) === 114 &&
			input.peek(7) === 105 &&
			input.peek(8) === 101 &&
			input.peek(9) === 100 // userBuried
		) {
			input.acceptToken(StateEnum, 10)
		} else if (
			input.peek(0) === 115 &&
			input.peek(1) === 99 &&
			input.peek(2) === 104 &&
			input.peek(3) === 101 &&
			input.peek(4) === 100 &&
			input.peek(5) === 117 &&
			input.peek(6) === 108 &&
			input.peek(7) === 101 &&
			input.peek(8) === 114 &&
			(input.peek(9) === 66 || input.peek(9) === 98) &&
			input.peek(10) === 117 &&
			input.peek(11) === 114 &&
			input.peek(12) === 105 &&
			input.peek(13) === 101 &&
			input.peek(14) === 100 // schedulerBuried
		) {
			input.acceptToken(StateEnum, 15)
		} else if (
			input.peek(0) === 115 &&
			input.peek(1) === 117 &&
			input.peek(2) === 115 &&
			input.peek(3) === 112 &&
			input.peek(4) === 101 &&
			input.peek(5) === 110 &&
			input.peek(6) === 100 &&
			input.peek(7) === 101 &&
			input.peek(8) === 100 // suspended
		) {
			input.acceptToken(StateEnum, 9)
		}
	},
	{ contextual: true },
)

export const ratingEnum = new ExternalTokenizer(
	(input) => {
		if (
			input.peek(0) === 49 || // 1
			input.peek(0) === 50 || // 2
			input.peek(0) === 51 || // 3
			input.peek(0) === 52 // 4
		) {
			input.acceptToken(RatingEnum, 1)
		} else if (
			input.peek(0) === 97 &&
			input.peek(1) === 103 &&
			input.peek(2) === 97 &&
			input.peek(3) === 105 &&
			input.peek(4) === 110 // again
		) {
			input.acceptToken(RatingEnum, 5)
		} else if (
			(input.peek(0) === 104 &&
				input.peek(1) === 97 &&
				input.peek(2) === 114 &&
				input.peek(3) === 100) || // hard
			(input.peek(0) === 103 &&
				input.peek(1) === 111 &&
				input.peek(2) === 111 &&
				input.peek(3) === 100) || // good
			(input.peek(0) === 101 &&
				input.peek(1) === 97 &&
				input.peek(2) === 115 &&
				input.peek(3) === 121) // easy
		) {
			input.acceptToken(RatingEnum, 4)
		}
	},
	{ contextual: true },
)

export const fieldValueEnum = new ExternalTokenizer(
	(input) => {
		if (
			input.peek(0) === 101 &&
			input.peek(1) === 120 &&
			input.peek(2) === 105 &&
			input.peek(3) === 115 &&
			input.peek(4) === 116 &&
			input.peek(5) === 115 // exists
		) {
			input.acceptToken(FieldValueEnum, 6)
		} else if (
			input.peek(0) === 109 &&
			input.peek(1) === 105 &&
			input.peek(2) === 115 &&
			input.peek(3) === 115 &&
			input.peek(4) === 105 &&
			input.peek(5) === 110 &&
			input.peek(6) === 103 // missing
		) {
			input.acceptToken(FieldValueEnum, 7)
		}
	},
	{ contextual: true },
)

export const rawStringLiteral = new ExternalTokenizer(
	rawLiteral(34, RawStringLiteral),
	{
		contextual: true,
	},
)

export const rawHtmlLiteral = new ExternalTokenizer(
	rawLiteral(96, RawHtmlLiteral),
	{
		contextual: true,
	},
)

function rawLiteral(delimiter: number, token: number) {
	return (input: InputStream) => {
		let i = 0
		while (input.peek(i) === delimiter) {
			i++
		}
		if (i <= 2) return
		const quoteCount = i
		let endingQuoteCount = 0
		while (endingQuoteCount !== quoteCount) {
			const current = input.peek(i)
			if (current === -1) return
			if (current === delimiter) {
				endingQuoteCount++
			} else if (endingQuoteCount !== 0) {
				endingQuoteCount = 0
			}
			i++
		}
		input.acceptToken(token, i)
	}
}
