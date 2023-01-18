import { jwtVerify } from "jose"
import { jwsPrivateKey } from "./config.js"

export async function getUser(
  auth: string | undefined
): Promise<string | undefined> {
  if (auth !== undefined) {
    const token = auth.split(" ")[1]
    const jwt = await jwtVerify(token, jwsPrivateKey)
    return jwt.payload.sub
  }
  return undefined
}

// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
  throw new Error(errorMessage)
}

export function optionMap<T, R>(
  t: T | null | undefined,
  f: (_: T) => R
): R | null | undefined {
  if (t == null) {
    return t as null | undefined
  }
  return f(t)
}
