import jwt from "jsonwebtoken"

export function getUser(auth: string | undefined): string | undefined {
  if (auth !== undefined) {
    const token = auth.split(" ")[1]
    const jwtPayload = jwt.verify(
      token,
      "qwertyuiopasdfghjklzxcvbnm123456" // highTODO
    ) as jwt.JwtPayload
    return jwtPayload.sub
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
