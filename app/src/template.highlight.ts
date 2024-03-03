/* eslint-disable @typescript-eslint/naming-convention */
import { styleTags, tags as t } from '@lezer/highlight'

export const xmlHighlighting = styleTags({
	Text: t.content,
	'StartTag StartCloseTag EndTag SelfCloseEndTag': t.brace,
	TagName: t.tagName,
	'MismatchedCloseTag/Tagname': [t.tagName, t.invalid],
	Transformer: t.attributeName,
	TransformerDelimiter: t.separator,
	If: t.controlOperator,
	Unless: t.controlOperator,
})
