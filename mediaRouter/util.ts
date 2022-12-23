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
  appMediaIdSecret: string,
  digest: ArrayBuffer
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength))
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(appMediaIdSecret),
    {
      name: "AES-GCM",
    },
    false,
    ["encrypt"]
  )
  const encryptedDigest = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    digest
  )
  const ivEncryptedDigest = prependIvToDigest(iv, encryptedDigest)
  return arrayBufferToBase64(ivEncryptedDigest)
}

export async function decryptDigest(
  ivEncryptedDigest: string,
  appMediaIdSecret: string
): Promise<string> {
  const [iv, encryptedDigest] = splitIvDigest(
    base64ToArrayBuffer(ivEncryptedDigest)
  )
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(appMediaIdSecret),
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"]
  )
  const digest = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encryptedDigest
  )
  return arrayBufferToBase64(digest)
}
