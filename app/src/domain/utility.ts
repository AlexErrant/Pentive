// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
  throw new Error(errorMessage)
}

// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  return doc.body.textContent ?? ""
}

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
