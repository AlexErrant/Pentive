import { expect, test } from 'vitest'
import { convert, validate } from './template2html'
import { defaultRenderContainer } from '../renderContainer'
import { toSampleCard, toSampleNote } from '../cardHtml'
import { getDefaultTemplate, throwExp, type Ord } from 'shared'

test('can handle opening (and closing) brace', () => {
	const input = `x{y{z{{}}`
	const tree = validate.call(defaultRenderContainer, input)!
	if (Array.isArray(tree)) throwExp('ya goofed')
	const r = convert.call(
		defaultRenderContainer,
		input,
		tree,
		true,
		toSampleCard(0 as Ord),
		toSampleNote(new Map()),
		// @ts-expect-error whatever
		getDefaultTemplate(null),
	)
	expect(input).toEqual(r.html)
})
