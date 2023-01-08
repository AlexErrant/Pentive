// https://basarat.gitbook.io/typescript/type-system/discriminated-unions#throw-in-exhaustive-checks
export function assertNever(_: never): never {
  throw new Error("Unexpected value. Should have been never.")
}

export function undefinedMap<T, R>(
  t: T | undefined,
  f: (_: T) => R
): R | undefined {
  if (t === undefined) {
    return t as undefined
  }
  return f(t)
}

// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
  throw new Error(errorMessage)
}
