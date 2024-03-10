import { parser as templateParser } from './templateParser'
import { htmlLanguage } from '@codemirror/lang-html'
import { LRLanguage } from '@codemirror/language'
import { parseMixed } from '@lezer/common'
import { Text } from './templateParser.terms'

const htmlTemplateParser = templateParser.configure({
	wrap: parseMixed((node) => {
		return node.type.isTop
			? {
					parser: htmlLanguage.parser,
					overlay: (node) => node.type.is(Text),
			  }
			: null
	}),
})

export const htmlTemplateLanguage = LRLanguage.define({
	parser: htmlTemplateParser,
})
