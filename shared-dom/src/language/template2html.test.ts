import { expect, test } from 'vitest'
import { convert, validate } from './template2html'
import { defaultRenderContainer } from '../testUtil'
import { toSampleCard, toSampleNote } from '../cardHtml'
import { getDefaultTemplate, throwExp, type Ord } from 'shared'

test('can handle opening (and closing) brace', () => {
	const input = `x{y{z{{}}{{Front}}`
	const tree = validate.call(defaultRenderContainer, input)
	if (Array.isArray(tree)) throwExp()
	const r = convert.call(
		defaultRenderContainer,
		input,
		tree,
		true,
		toSampleCard(0 as Ord),
		toSampleNote(new Map([['Front', 'Foo']])),
		// @ts-expect-error whatever
		getDefaultTemplate(null),
	)
	expect(`x{y{z{{}}Foo`).toEqual(r.html)
})
