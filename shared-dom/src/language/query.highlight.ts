import { Tag, styleTags, tags as t } from '@lezer/highlight'
import { HighlightStyle, type TagStyle } from '@codemirror/language'
import { stringLabels } from './stringLabels'

const labelGroup = Tag.define()
const labelValue = Tag.define()

export const queryHighlighting = styleTags({
	/* eslint-disable @typescript-eslint/naming-convention */
	'Not Or Wildcard Is': t.operatorKeyword,
	Regex: t.regexp,
	'Label/...': labelGroup,
	KindValue: labelValue,
	/* eslint-enable @typescript-eslint/naming-convention */
	[stringLabels.join(' ')]: t.labelName,
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
			tag: labelValue,
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
