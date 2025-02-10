// https://github.com/dubzzz/fast-check/issues/490#issuecomment-1215040121

import fc, { type Arbitrary, type RecordConstraints } from 'fast-check'
import { Ulid } from 'id128'
import type { Base64Url } from 'shared/brand'
import { base16 } from '@scure/base'
import { nookIdRegex } from 'shared/schema'
import { arrayToBase64url } from 'shared/binary'

// https://stackoverflow.com/a/72760489
type OptionalKeys<T> = Required<{
	[K in keyof T as undefined extends T[K] ? K : never]: T[K]
}>

type RequiredKeys<T> = {
	[K in keyof T as undefined extends T[K] ? never : K]: T[K]
}

export function recordWithOptionalFields<T>(
	required: {
		[K in keyof RequiredKeys<T>]: Arbitrary<T[K]>
	},
	optional: {
		[K in keyof OptionalKeys<T>]: Arbitrary<T[K]>
	},
): Arbitrary<T> {
	const ret = fc
		.tuple(
			fc.record<RequiredKeys<T>>(required),
			fc.record<OptionalKeys<T>, RecordConstraints<keyof OptionalKeys<T>>>(
				optional,
				{
					withDeletedKeys: true,
				},
			),
		)
		.map(([r, o]) => ({ ...r, ...o }))
	return ret as unknown as Arbitrary<T>
}

export const reasonableDates = fc.date({
	min: new Date('1971-01-01T00:00:00.000Z'),
	max: new Date('9999-12-31T23:59:59.999Z'),
})

export function arbitraryUlid<T extends Base64Url>(): fc.Arbitrary<T> {
	return fc
		.date({
			min: new Date(1971, 0, 1),
			max: new Date(9999, 7, 2),
		})
		.map((time) => {
			const hexUlid = Ulid.generate({ time }).toRaw()
			return arrayToBase64url(base16.decode(hexUlid)) as T
		})
}

export const arbitraryNookId = fc.stringMatching(nookIdRegex)
