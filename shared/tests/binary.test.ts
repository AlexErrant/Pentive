import { test } from 'vitest'
import fc from 'fast-check'
import assert from 'assert'
import { numberToUint8Array, uint8ArrayToNumber } from '../src/binary'

test('numberToUint8Array and uint8ArrayToNumber rountrip', () => {
	fc.assert(
		fc.property(
			fc.integer({
				min: 0,
				max: 281474976710655, // https://github.com/ulid/spec#overflow-errors-when-parsing-base32-strings
			}),
			(expected) => {
				const array = numberToUint8Array(expected)
				const actual = uint8ArrayToNumber(array)
				assert.equal(actual, expected)
			},
		),
	)
})
