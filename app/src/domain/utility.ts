import { Ulid } from "id128"
import {
  type Base64Url,
  base64url,
  hex,
  throwExp,
  packageJsonValidator,
} from "shared"
import { TarReader } from "./tar"

// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.body.textContent ?? ""
}

export function ulidAsBase64Url(): Base64Url {
  const hexUlid = Ulid.generate().toRaw()
  return base64url.encode(hex.decode(hexUlid)).slice(0, 22) as Base64Url
}

export async function getTarReader(blob: Blob) {
  const decompressedStream = (
    blob.stream() as unknown as ReadableStream<Uint8Array>
  ) // not sure why Typescript thinks .stream() yields a Node stream
    .pipeThrough(new DecompressionStream("gzip"))
  const reader = new TarReader()
  await reader.readFile(await new Response(decompressedStream).blob())
  return reader
}

export async function getPackageJson(file: File) {
  const reader = await getTarReader(file)
  const packageJsonText =
    reader.getTextFile("package/package.json") ??
    throwExp("`package/package.json` not found")
  return packageJsonValidator.parse(JSON.parse(packageJsonText))
}

export async function getMain(blob: Blob) {
  const reader = await getTarReader(blob)
  const packageJsonText =
    reader.getTextFile("package/package.json") ??
    throwExp("`package/package.json` not found")
  let { main } = packageJsonValidator.parse(JSON.parse(packageJsonText))
  if (main == null) {
    main = "package/index.js"
  } else if (main.startsWith("./")) {
    main = "package" + main.substring(1)
  } else if (main.startsWith("/")) {
    main = "package" + main
  } else {
    main = "package/" + main
  }
  return (
    reader.getFileBlob(main, "text/javascript") ??
    throwExp(
      `${main} not found. Is the 'main' in your 'package.json' correct? (We add the 'package' top level directory.)`
    )
  )
}
