type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type UserId = Brand<string, "userId">
export type AppMediaIdSecretBase64 = Brand<string, "appMediaIdSecretBase64">
export type IvEncryptedDigestBase64 = Brand<string, "ivEncryptedDigestBase64">
export type Digest = Brand<ArrayBuffer, "digest">
export type DigestBase64 = Brand<string, "digestBase64">

export const ivLength = 12 // https://crypto.stackexchange.com/q/41601

export function toBase64URL(base64: string): string {
  return base64.replaceAll("+", "-").replaceAll("/", "_")
}

export function fromBase64URL(base64url: string): string {
  return base64url.replaceAll("-", "+").replaceAll("_", "/")
}

// https://stackoverflow.com/a/38858127/
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// https://gist.github.com/72lions/4528834
function prependIvToDigest(iv: Uint8Array, digest: ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(iv.byteLength + digest.byteLength)
  tmp.set(iv, 0)
  tmp.set(new Uint8Array(digest), iv.byteLength)
  return tmp.buffer
}

function splitIvDigest(
  ivEncryptedDigest: ArrayBuffer
): [ArrayBuffer, ArrayBuffer] {
  const iv = ivEncryptedDigest.slice(0, ivLength)
  const encryptedDigest = ivEncryptedDigest.slice(ivLength)
  return [iv, encryptedDigest]
}

export async function encryptDigest(
  appMediaIdSecret: AppMediaIdSecretBase64,
  digest: Digest
): Promise<IvEncryptedDigestBase64> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength))
  const key = await generateKey(appMediaIdSecret, "encrypt")
  const encryptedDigest = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    digest
  )
  const ivEncryptedDigest = prependIvToDigest(iv, encryptedDigest)
  return arrayBufferToBase64(ivEncryptedDigest) as IvEncryptedDigestBase64
}

export async function decryptDigest(
  ivEncryptedDigest: IvEncryptedDigestBase64,
  appMediaIdSecret: AppMediaIdSecretBase64
): Promise<DigestBase64> {
  const [iv, encryptedDigest] = splitIvDigest(
    base64ToArrayBuffer(ivEncryptedDigest)
  )
  const key = await generateKey(appMediaIdSecret, "decrypt")
  const digest = (await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encryptedDigest
  )) as Digest
  return arrayBufferToBase64(digest) as DigestBase64
}

async function generateKey(
  appMediaIdSecret: AppMediaIdSecretBase64,
  keyUsage: "decrypt" | "encrypt"
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(appMediaIdSecret),
    {
      name: "AES-GCM",
    },
    false,
    [keyUsage]
  )
}
