import { parser as queryParser } from './queryParser'
import { parser as globParser } from './globParser'
import { parseMixed } from '@lezer/common'
import * as qt from './queryParser.terms'
import { LRLanguage, LanguageSupport } from '@codemirror/language'

export function globQuery(languageData?: Record<string, unknown>) {
	const queryLanguage = LRLanguage.define({
		parser: queryParser,
		languageData,
	})
	const globLanguage = LRLanguage.define({
		parser: globParser,
		languageData,
	})
	return new LanguageSupport(
		queryLanguage.configure({
			wrap: parseMixed((node) =>
				node.type.is(qt.SimpleString) ? { parser: globLanguage.parser } : null,
			),
		}),
	)
}
