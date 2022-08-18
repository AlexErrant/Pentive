// https://github.com/dubzzz/fast-check/issues/490#issuecomment-1215040121

import fc, { Arbitrary, RecordConstraints } from "fast-check"

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
  }
): Arbitrary<T> {
  const ret = fc
    .tuple(
      fc.record<RequiredKeys<T>>(required),
      fc.record<OptionalKeys<T>, RecordConstraints<keyof OptionalKeys<T>>>(
        optional,
        {
          withDeletedKeys: true,
        }
      )
    )
    .map(([r, o]) => ({ ...r, ...o }))
  return ret as unknown as Arbitrary<T>
}

// Dates larger or smaller than this hit RxDB's index's char limit.
export const reasonableDates = fc.date({
  min: new Date("0000-01-01T00:00:00.000Z"),
  max: new Date("9999-12-31T23:59:59.999Z"),
})
