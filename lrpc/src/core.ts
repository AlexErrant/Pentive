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
