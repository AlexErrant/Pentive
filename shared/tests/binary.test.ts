import { expect, test } from 'vitest'
import fc from 'fast-check'
import assert from 'assert'
import {
	idLength,
	incrementRandom,
	prefixEpochToArray,
	epochLength,
	idToEpoch,
} from '../src/binary'

const epochMax = Math.pow(2, epochLength * 8) - 1 // https://github.com/ulid/spec#overflow-errors-when-parsing-base32-strings

test('idToEpoch and prefixEpochToArray rountrip', () => {
	fc.assert(
		fc.property(
			fc.record({
				epoch: fc.integer({
					min: 0,
					max: epochMax,
				}),
				id: fc.uint8Array({
					minLength: idLength,
					maxLength: idLength,
				}),
			}),
			({ epoch, id }) => {
				prefixEpochToArray(epoch, id)
				const actual = idToEpoch(id)
				assert.equal(actual, epoch)
			},
		),
	)
})

test('incrementRandom increments', () => {
	function uint8ArrayToNumber(arr: Uint8Array) {
		let num = 0n
		for (const i of arr) {
			num = num * 256n + BigInt(i)
		}
		return num
	}
	fc.assert(
		fc.property(
			fc.record({
				epoch: fc.integer({
					min: 0,
					max: epochMax,
				}),
				id: fc.uint8Array({
					minLength: idLength,
					maxLength: idLength,
				}),
			}),
			({ epoch, id }) => {
				prefixEpochToArray(epoch, id)
				const randomArrayA = id.slice(epochLength)
				incrementRandom(id)
				const randomArrayB = id.slice(epochLength)
				const actualEpoch = idToEpoch(id)
				assert.equal(actualEpoch, epoch)
				assert.equal(
					uint8ArrayToNumber(randomArrayA) + 1n,
					uint8ArrayToNumber(randomArrayB),
				)
			},
		),
	)
})

// zero epoch
const e = [0, 0, 0, 0, 0, 0]

test.each([
	[
		[...e, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[...e, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
	],
	[
		[...e, 255, 255, 255, 255, 255, 255, 255, 255, 255, 254],
		[...e, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
	],
	[
		[...e, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255],
		[...e, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	],
])('increment %o', (a, b) => {
	expect(a.length).toEqual(16)
	expect(b.length).toEqual(16)
	const aa = new Uint8Array(a)
	const bb = new Uint8Array(b)
	incrementRandom(aa)
	expect(aa).toEqual(bb)
})

test('incrementRandom increments, max', () => {
	const max = new Uint8Array([
		...e,
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255,
		255,
	])
	expect(max.length).toEqual(16)
	expect(() => {
		incrementRandom(max)
	}).toThrowError('max random reached')
})
