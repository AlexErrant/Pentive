import { compile } from 'html-to-text'

const ftsNormalizeHelper = compile({
	selectors: [
		{
			selector: 'hr',
			format: 'inlineString',
			options: { string: ' ' },
		},
	],
})

export function ftsNormalize(html: string, removeCombiningCharacters: boolean) {
	let r = ftsNormalizeHelper(html).replace(/\s+/g, ' ').trim()
	if (removeCombiningCharacters) {
		// https://stackoverflow.com/a/37511463
		r = r.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
	}
	return r
}

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
