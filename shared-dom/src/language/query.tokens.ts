import { ExternalTokenizer, type InputStream } from '@lezer/lr'
import {
	RawQuoted1Open,
	RawQuoted1Content,
	RawQuoted1Close,
	RawQuoted2Open,
	RawQuoted2Content,
	RawQuoted2Close,
	RawHtmlOpen,
	RawHtmlContent,
	RawHtmlClose,
} from './queryParser.terms'

const pound = 35
const caret = 94
const doubleQuote = 34
const quote = 39
const backtick = 96

export const rawQuotedOpen = new ExternalTokenizer((input) => {
	if (rawOpen(input, doubleQuote)) {
		input.acceptToken(RawQuoted2Open)
	} else if (rawOpen(input, quote)) {
		input.acceptToken(RawQuoted1Open)
	}
})
export const rawHtmlOpen = new ExternalTokenizer((input) => {
	if (rawOpen(input, backtick)) {
		input.acceptToken(RawHtmlOpen)
	}
})

export const rawQuoted1Content = new ExternalTokenizer((input) => {
	rawContent(input, quote, RawQuoted1Content)
})
export const rawQuoted2Content = new ExternalTokenizer((input) => {
	rawContent(input, doubleQuote, RawQuoted2Content)
})
export const rawHtmlContent = new ExternalTokenizer((input) => {
	rawContent(input, backtick, RawHtmlContent)
})

export const rawQuoted1Close = new ExternalTokenizer((input) => {
	rawClose(input, RawQuoted1Close)
})
export const rawQuoted2Close = new ExternalTokenizer((input) => {
	rawClose(input, RawQuoted2Close)
})
export const rawHtmlClose = new ExternalTokenizer((input) => {
	rawClose(input, RawHtmlClose)
})

// This might be a mistake but I don't think I need to use ContextTracker here. We'll see.
let quoteCount: number

function rawOpen(input: InputStream, delimiter: number) {
	if (input.next === caret) input.advance()
	if (input.next === pound) input.advance()
	if (input.next === pound) input.advance()
	if (input.next === caret) input.advance()
	let i = 0
	while (input.next === delimiter) {
		i++
		input.advance()
	}
	if (i <= 2) return false
	quoteCount = i
	return true
}

function rawContent(input: InputStream, delimiter: number, token: number) {
	let endingQuoteCount = 0
	while (endingQuoteCount !== quoteCount) {
		if (input.next === -1) return
		if (input.next === delimiter) {
			endingQuoteCount++
		} else if (endingQuoteCount !== 0) {
			endingQuoteCount = 0
		}
		input.advance()
	}
	input.acceptToken(token, -quoteCount)
}

function rawClose(input: InputStream, token: number) {
	for (let index = 0; index < quoteCount; index++) {
		input.advance()
	}
	if (input.next === caret) input.advance()
	if (input.next === pound) input.advance()
	if (input.next === pound) input.advance()
	if (input.next === caret) input.advance()
	input.acceptToken(token)
}
