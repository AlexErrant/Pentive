import { base64ToArray } from "shared"

let jwsSecret: null | Uint8Array = null

export function getJwsSecret(jwsSecretString: string): Uint8Array {
  if (jwsSecret === null) {
    jwsSecret = base64ToArray(jwsSecretString)
  }
  return jwsSecret
}
