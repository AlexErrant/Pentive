import { importPKCS8, SignJWT } from "jose"
import { type UserId } from "shared"

export const alg = "EdDSA"

export async function getPeerToken(userId: UserId, privateKeyString: string) {
  const privateKey = await importPKCS8(privateKeyString, alg)
  return await new SignJWT({})
    .setProtectedHeader({ alg })
    .setSubject(userId)
    // .setJti() // highTODO
    // .setNotBefore()
    // .setIssuedAt()
    // .setIssuer("urn:example:issuer")
    // .setAudience("urn:example:audience")
    // .setExpirationTime("2h")
    .sign(privateKey)
}
