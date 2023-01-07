import { Base64, Base64Url } from "./brand"

export function toBase64URL(base64: Base64): Base64Url {
  return base64.replaceAll("+", "-").replaceAll("/", "_") as Base64Url
}

export function fromBase64URL(base64url: Base64Url): Base64 {
  return base64url.replaceAll("-", "+").replaceAll("_", "/") as Base64
}
