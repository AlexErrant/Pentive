// https://github.com/dubzzz/fast-check/issues/490#issuecomment-1215040121

import fc, { type Arbitrary, type RecordConstraints } from 'fast-check'
import { Ulid } from 'id128'
import { type Brand } from 'shared/brand'
import { base64url, hex } from '@scure/base'

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
	min: new Date('0000-01-01T00:00:00.000Z'),
	max: new Date('9999-12-31T23:59:59.999Z'),
})

export function arbitraryUlid<
	T extends Brand<string, 'base64url'>,
>(): fc.Arbitrary<T> {
	return fc
		.date({
			min: new Date(1970, 0, 1),
			max: new Date(10889, 7, 2),
		})
		.map((time) => {
			const hexUlid = Ulid.generate({ time }).toRaw()
			const x = base64url.encode(hex.decode(hexUlid)).slice(0, 22)
			return x as T
		})
}
