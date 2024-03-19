import { Tag, styleTags, tags as t } from '@lezer/highlight'
import { HighlightStyle, type TagStyle } from '@codemirror/language'

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

function createSpecs(isLight: boolean) {
	const overline = `overline ${isLight ? 'black' : 'white'}`
	return [
		{ tag: t.operatorKeyword, ...notSearchTermStyle },
		{
			tag: t.labelName,
			textDecoration: overline,
			...notSearchTermStyle,
		},
		{
			tag: childStringTag,
			textDecoration: overline,
		},
	] satisfies readonly TagStyle[]
}

export const queryDarkHighlightStyle = HighlightStyle.define(
	createSpecs(false),
	{
		themeType: 'dark',
	},
)

export const queryLightHighlightStyle = HighlightStyle.define(
	createSpecs(true),
	{
		themeType: 'light',
	},
)
