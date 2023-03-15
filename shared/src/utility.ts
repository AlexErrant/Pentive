// https://basarat.gitbook.io/typescript/type-system/discriminated-unions#throw-in-exhaustive-checks
export function assertNever(x: never): never {
  throw new Error(
    `Expected 'never', but got an unexpected value:
${JSON.stringify(x)}`
  )
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

export function nullMap<T, R>(t: T | null, f: (_: T) => R): R | null {
  if (t === null) {
    return t as null
  }
  return f(t)
}

// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
  throw new Error(errorMessage)
}

// https://stackoverflow.com/a/38858127/
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return uint8ArrayToBase64(bytes)
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArray(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// https://stackoverflow.com/a/46700791/
export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined
}

// highTODO property test
export function stringifyMap(map: Map<unknown, unknown>) {
  return JSON.stringify(Object.fromEntries(map))
}

export function parseMap<T extends string, U>(rawMap: string) {
  const parsed = JSON.parse(rawMap) as Record<T, U>
  const entries = Object.entries(parsed) as Array<[T, U]>
  return new Map(entries)
}

// highTODO property test
export function stringifySet(set: Set<unknown> | ReadonlySet<unknown>) {
  return JSON.stringify([...set])
}

export function parseSet<T>(rawSet: string) {
  const parsed = JSON.parse(rawSet) as T[]
  return new Set(parsed)
}

// https://stackoverflow.com/a/69827802
export function unproxify<T>(val: T): T {
  if (val instanceof Array) return val.map(unproxify) as T
  if (val instanceof Map) return new Map(val) as T
  if (val instanceof Date) return new Date(val) as T
  if (val instanceof Object)
    // @ts-expect-error whatever
    return Object.fromEntries(
      Object.entries(Object.assign({}, val)).map(([k, v]) => [k, unproxify(v)])
    )
  return val
}
