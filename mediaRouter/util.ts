type Brand<T, B> = T & { readonly brand: B } // https://medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d

export type UserId = Brand<string, "userId">
export type AppMediaIdSecretBase64 = Brand<string, "appMediaIdSecretBase64">
export type IvEncryptedDigestBase64 = Brand<string, "ivEncryptedDigestBase64">
export type Digest = Brand<ArrayBuffer, "digest">
export type DigestBase64 = Brand<string, "digestBase64">

export type Result<TOk, TError> =
  | {
      readonly tag: "Ok"
      readonly ok: TOk
    }
  | {
      readonly tag: "Error"
      readonly error: TError
    }

export function toOk<T>(ok: T): { tag: "Ok"; ok: T } {
  return {
    tag: "Ok",
    ok,
  }
}

export function toError<T>(error: T): { tag: "Error"; error: T } {
  return {
    tag: "Error",
    error,
  }
}

export const ivLength = 12 // https://crypto.stackexchange.com/q/41601

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
function concat(a1: Uint8Array, a2: ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(a1.byteLength + a2.byteLength)
  tmp.set(a1, 0)
  tmp.set(new Uint8Array(a2), a1.byteLength)
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
  digest: Digest,
  userId: UserId
): Promise<IvEncryptedDigestBase64> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength))
  const key = await generateKey(appMediaIdSecret, "encrypt", userId)
  const encryptedDigest = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    digest
  )
  const ivEncryptedDigest = concat(iv, encryptedDigest)
  return arrayBufferToBase64(ivEncryptedDigest) as IvEncryptedDigestBase64
}

export async function decryptDigest(
  ivEncryptedDigest: IvEncryptedDigestBase64,
  appMediaIdSecret: AppMediaIdSecretBase64,
  userId: UserId
): Promise<Result<DigestBase64, string>> {
  const [iv, encryptedDigest] = splitIvDigest(
    base64ToArrayBuffer(ivEncryptedDigest)
  )
  const key = await generateKey(appMediaIdSecret, "decrypt", userId)
  try {
    const digest = (await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encryptedDigest
    )) as Digest
    return toOk(arrayBufferToBase64(digest) as DigestBase64)
  } catch (error) {
    if (error instanceof DOMException) {
      return toError(`Failed to decrypt input.`)
    }
    throw error
  }
}

async function generateKey(
  appMediaIdSecret: AppMediaIdSecretBase64,
  keyUsage: "decrypt" | "encrypt",
  userId: UserId
): Promise<CryptoKey> {
  const userIdBytes = new TextEncoder().encode(userId)
  const aesKey = await crypto.subtle.digest(
    {
      name: "SHA-256",
    },
    concat(userIdBytes, base64ToArrayBuffer(appMediaIdSecret))
  )
  return await crypto.subtle.importKey(
    "raw",
    aesKey,
    {
      name: "AES-GCM",
    },
    false,
    [keyUsage]
  )
}
