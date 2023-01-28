export type Result<TOk, TError> =
  | {
      readonly tag: "Ok"
      readonly ok: TOk
    }
  | {
      readonly tag: "Error"
      readonly error: TError
    }

export function toOk<T>(ok: T): { tag: "Ok"; ok: T } {
  return {
    tag: "Ok",
    ok,
  }
}

export function toError<T>(error: T): { tag: "Error"; error: T } {
  return {
    tag: "Error",
    error,
  }
}

// https://gist.github.com/72lions/4528834
export function concat(a1: Uint8Array, a2: ArrayBuffer): Uint8Array {
  const tmp = new Uint8Array(a1.byteLength + a2.byteLength)
  tmp.set(a1, 0)
  tmp.set(new Uint8Array(a2), a1.byteLength)
  return tmp
}
