import { compile } from 'html-to-text'
import { caseFold } from './caseFold'

const ftsNormalizeHelper = compile({
	selectors: [
		{
			selector: 'hr',
			format: 'inlineString',
			options: { string: ' ' },
		},
	],
})

/*
https://www.b-list.org/weblog/2023/dec/23/compare-python-strings
https://w3c.github.io/string-search
https://www.unicode.org/reports/tr30/tr30-4.html
https://www.w3.org/wiki/I18N/CanonicalNormalization
https://www.w3.org/html/wg/wiki/HTMLCharacterUsage
https://alistapart.com/article/accent-folding-for-auto-complete
https://www.gyro-php.org/posts/16
https://www.npmjs.com/package/unidecode
*/
export function ftsNormalize(
	html: string,
	stripHtml: boolean,
	caseFoldBool: boolean,

	removeCombiningCharacters_DoNotEnableByDefault: boolean,
) {
	// "The W3C Character Model for the World Wide Web 1.0: Normalization [CharNorm]... recommend using Normalization Form C for all content" https://www.unicode.org/reports/tr15/
	let r = html.normalize() // defaults to "NFC"
	if (stripHtml) {
		r = ftsNormalizeHelper(html).replace(/\s+/g, ' ').trim()
	}
	// Normalization precedes case folding https://www.w3.org/TR/charmod-norm/#PreNormalization
	// 1. Perform Unicode normalization of the string to form NFD or form NFC.
	// 2. Perform Unicode Full case folding of the resulting string.
	if (caseFoldBool) {
		r = caseFold(r)
	}
	// Do not enable this by default!
	// "a process that attempts to remove accents from letters by decomposing the text and then
	// removing all of the combining characters will break languages that rely on combining marks" https://www.w3.org/TR/charmod-norm/#additionalMatchTailoring
	if (removeCombiningCharacters_DoNotEnableByDefault) {
		// https://stackoverflow.com/a/37511463 also grep 7D669B43-CEA7-45E6-AB82-D2B18C20D633
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
