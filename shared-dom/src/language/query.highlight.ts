import { Tag, styleTags, tags as t } from '@lezer/highlight'
import { HighlightStyle, type TagStyle } from '@codemirror/language'
import { stringLabels } from './stringLabels'

const wildcard = Tag.define()
const squared = Tag.define()
const labelGroup = Tag.define()
const labelValue = Tag.define()
const delimiter = Tag.define()

export const queryHighlighting = styleTags({
	'Not Or Wildcard Is': t.operatorKeyword,
	'Open Close': delimiter,
	Regex: t.regexp,
	Group: t.paren,
	'Label/...': labelGroup,
	'RatingEnum StateEnum KindEnum DueEnum FieldValueEnum': labelValue,
	'Squared/...': squared,
	'Wildcard Wildcard1': wildcard,

	[stringLabels.join(' ')]: t.labelName,
})

// medTODO needs work. Graphic design is (not) my passion.
const notSearchTermStyle = {
	color: 'darkorange',
	fontStyle: 'italic',
	fontWeight: 'bold',
} as const

function createSpecs(isLight: boolean) {
	const overline = `overline ${isLight ? 'black' : 'white'}`
	return [
		{
			tag: [wildcard, squared],
			...notSearchTermStyle,
			fontFamily: 'monospace',
			fontStyle: 'normal',
		},
		{ tag: t.operatorKeyword, ...notSearchTermStyle },
		{
			tag: t.regexp,
			...notSearchTermStyle,
			fontFamily: 'monospace',
			fontStyle: 'normal',
		},
		{
			tag: t.labelName,
			textDecoration: overline,
			...notSearchTermStyle,
		},
		{
			tag: labelGroup,
			textDecoration: overline,
		},
		{
			tag: t.paren,
			...notSearchTermStyle,
			fontStyle: 'normal',
		},
		{
			tag: labelValue,
			...notSearchTermStyle,
		},
		{
			tag: delimiter,
			...notSearchTermStyle,
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
