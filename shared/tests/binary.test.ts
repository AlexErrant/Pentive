import { test } from 'vitest'
import fc from 'fast-check'
import assert from 'assert'
import {
	incrementUint8Array,
	numberToUint8Array,
	uint8ArrayToNumber,
} from '../src/binary'

const max = 281474976710655 // https://github.com/ulid/spec#overflow-errors-when-parsing-base32-strings

test('numberToUint8Array and uint8ArrayToNumber rountrip', () => {
	fc.assert(
		fc.property(
			fc.integer({
				min: 0,
				max,
			}),
			(expected) => {
				const array = numberToUint8Array(expected)
				const actual = uint8ArrayToNumber(array)
				assert.equal(actual, expected)
			},
		),
	)
})

test('incrementUint8Array increments', () => {
	fc.assert(
		fc.property(
			fc.integer({
				min: 0,
				max: max - 1, // don't increment past max
			}),
			(expected) => {
				const array = numberToUint8Array(expected)
				incrementUint8Array(array)
				const actual = uint8ArrayToNumber(array)
				assert.equal(actual, expected + 1)
			},
		),
	)
})
