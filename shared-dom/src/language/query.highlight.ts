import { Tag, styleTags, tags as t } from '@lezer/highlight'
import { HighlightStyle } from '@codemirror/language'

const childStringTag = Tag.define()

const prefixes = ['Deck', 'Tag', 'Template']
function childStringKeys() {
	const suffixes = ['SimpleString', 'QuotedString']
	const r = []
	for (const p of prefixes) {
		for (const s of suffixes) {
			r.push(`${p}/${s}`)
		}
	}
	return r.join(' ')
}

export const queryHighlighting = styleTags({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'Not Or': t.operatorKeyword,
	[childStringKeys()]: childStringTag,
	[prefixes.join(' ')]: t.labelName,
})

const notSearchTermStyle = {
	color: 'darkorange',
	fontStyle: 'italic',
	fontWeight: 'bold',
} as const

export const queryHighlightStyle = HighlightStyle.define([
	{ tag: t.operatorKeyword, ...notSearchTermStyle },
	{
		tag: t.labelName,
		textDecoration: 'overline black',
		...notSearchTermStyle,
	},
	{
		tag: childStringTag,
		textDecoration: 'overline black',
	},
])
