import { compile } from 'html-to-text'

export const toFts = compile({
	selectors: [
		{
			selector: 'hr',
			format: 'inlineString',
			options: { string: ' ' },
		},
	],
})

const toOneLineHelper = compile({
	selectors: [
		{
			selector: 'hr',
			format: 'inlineString',
			options: { string: '|' },
		},
	],
})

export function toOneLine(html: string) {
	return toOneLineHelper(html).replace(/\s+/g, ' ').trim()
}
