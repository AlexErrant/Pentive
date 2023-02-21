import { Ulid } from "id128"
import { Base64Url, base64url, hex } from "shared"

// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.body.textContent ?? ""
}

export function ulidAsBase64Url(): Base64Url {
  const hexUlid = Ulid.generate().toRaw()
  return base64url.encode(hex.decode(hexUlid)).slice(0, 22) as Base64Url
}
