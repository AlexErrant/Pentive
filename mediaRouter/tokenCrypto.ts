import { base64, Base64Url, base64url, Brand } from "shared"
import { concat } from "./util"

export type MediaId = Brand<Uint8Array, "mediaId">
export type UserId = Brand<string, "userId">
export type TokenSecretBase64 = Brand<string, "tokenSecretBase64" | "base64">

/*

`token` is `msg` + `signature`.
`msg` is just the `mediaId`.
`message`, distinct from `msg`, is `msg` + `userId`.
`signature` is HMAC of `message`.
`userId` is omitted from `msg` to save space. `userId` will be determined from JWT.

                                                   token
               ______________________________________/\______________________________________
              /                                                                              \
              73724490b1f9c38e96a250a6ec84be72ad6a6b9325d4f22ddf4290ba606d5ef0366fda8447245343
              \__________________  __________________/\__________________  __________________/
                                 \/                                      \/
                                msg                                  signature
              \__________________  __________________/
                                 \/                   
    userId                    mediaId                
 _____/\_____  __________________/\__________________ 
/            \/                                      \
73724490b1f9c373724490b1f9c38e96a250a6ec84be72ad6a6b93
\_________________________  _________________________/
                          \/
                        message

*/

export async function buildToken(
  tokenSecret: TokenSecretBase64,
  mediaId: MediaId,
  userId: UserId
): Promise<Base64Url> {
  const signature = await signMessage(tokenSecret, mediaId, userId)
  const token = concat(mediaId, signature)
  return base64url.encode(token) as Base64Url
}

function parseToken(token: ArrayBuffer): [MediaId, ArrayBuffer] {
  const mediaId = token.slice(0, 32) as MediaId
  const signature = token.slice(32)
  return [mediaId, signature]
}

let maybeTokenKey: CryptoKey | null = null
async function getTokenKey(tokenSecret: TokenSecretBase64): Promise<CryptoKey> {
  if (maybeTokenKey == null) {
    maybeTokenKey = await crypto.subtle.importKey(
      "raw",
      base64.decode(tokenSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
  }
  return maybeTokenKey
}

function buildMessage(userId: UserId, mediaId: MediaId): ArrayBuffer {
  const encodedUserId = new TextEncoder().encode(userId)
  return concat(encodedUserId, mediaId)
}

async function signMessage(
  tokenSecret: TokenSecretBase64,
  mediaId: MediaId,
  userId: UserId
): Promise<ArrayBuffer> {
  const tokenKey = await getTokenKey(tokenSecret)
  const message = buildMessage(userId, mediaId)
  return await crypto.subtle.sign("HMAC", tokenKey, message)
}

export async function getMediaId(
  tokenSecret: TokenSecretBase64,
  userId: UserId,
  token: ArrayBuffer
): Promise<MediaId | null> {
  const [mediaId, signature] = parseToken(token)
  const tokenKey = await getTokenKey(tokenSecret)
  const message = buildMessage(userId, mediaId)
  const isValid = await crypto.subtle.verify(
    "HMAC",
    tokenKey,
    signature,
    message
  )
  return isValid ? mediaId : null
}
