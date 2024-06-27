import { parser as queryParser } from './queryParser'
import { parser as globParser } from './globParser'
import { parseMixed } from '@lezer/common'
import * as qt from './queryParser.terms'

export const globQueryParser = queryParser.configure({
	wrap: parseMixed((node) =>
		node.type.is(qt.SimpleString)
			? { parser: globParser, overlay: (x) => x.node.type.is(qt.SimpleString) }
			: null,
	),
})
