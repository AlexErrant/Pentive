 
import { styleTags, tags as t } from '@lezer/highlight'

export const xmlHighlighting = styleTags({
	Text: t.content,
	'StartTag StartCloseTag EndTag': t.brace,
	TagName: t.tagName,
	'MismatchedCloseTag/TagName': [t.tagName, t.invalid],
	Transformer: t.attributeName,
	TransformerDelimiter: t.separator,
	If: t.controlOperator,
	Unless: t.controlOperator,
})
