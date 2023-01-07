export function toBase64URL(base64: string): string {
  return base64.replaceAll("+", "-").replaceAll("/", "_")
}

export function fromBase64URL(base64url: string): string {
  return base64url.replaceAll("-", "+").replaceAll("_", "/")
}
