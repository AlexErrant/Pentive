import { Ulid } from "id128"
import { type Base64Url, base64url, hex } from "shared"
import { compile } from "html-to-text"
const convert = compile({})

export const strip = convert

export function ulidAsBase64Url(): Base64Url {
  const hexUlid = Ulid.generate().toRaw()
  return base64url.encode(hex.decode(hexUlid)).slice(0, 22) as Base64Url
}

// https://stackoverflow.com/a/22015930
export const zip = <T>(a: T[], b: T[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a.at(i), b.at(i)])
