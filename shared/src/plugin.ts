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

const packageJsonValidator = z.object({
  name: z.string(),
  main: z.string().optional(),
})

async function getTarReader(blob: Blob) {
  const decompressedStream = (
    blob.stream() as unknown as ReadableStream<Uint8Array>
  ) // not sure why Typescript thinks .stream() yields a Node stream
    .pipeThrough(new DecompressionStream("gzip"))
  const reader = new TarReader()
  await reader.readFile(await new Response(decompressedStream).blob())
  return reader
}

export async function parsePluginNpmPackage(blob: Blob) {
  const reader = await getTarReader(blob)
  const packageJsonText =
    reader.getTextFile("package/package.json") ??
    throwExp("`package/package.json` not found")
  const packageJson = packageJsonValidator.parse(JSON.parse(packageJsonText))
  let { main } = packageJson
  if (main == null) {
    main = "package/index.js"
  } else if (main.startsWith("./")) {
    main = "package" + main.substring(1)
  } else if (main.startsWith("/")) {
    main = "package" + main
  } else {
    main = "package/" + main
  }
  const script =
    reader.getFileBlob(main, "text/javascript") ??
    throwExp(
      `${main} not found. Is the 'main' in your 'package.json' correct? (We add the 'package' top level directory.)`
    )
  return {
    script,
    name: packageJson.name,
  }
}
