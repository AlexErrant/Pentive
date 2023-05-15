import { z } from "zod"
import { type PluginId } from "./brand"
import { TarReader } from "./tar.js"
import { throwExp } from "./utility"

export interface Plugin {
  readonly name: string
  readonly id: PluginId
  readonly created: Date
  readonly updated: Date
  readonly script: Blob
}

export const packageJsonValidator = z.object({
  name: z.string(),
  main: z.string().optional(),
})

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
