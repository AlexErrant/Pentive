import { freeze } from "immer"
import { type Plugin } from "./plugin"
import {
  defaultRenderContainer,
  type RenderContainer,
  type RenderPluginExports,
} from "./renderContainer.js"

// https://stackoverflow.com/a/18650249
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.readAsDataURL(blob) // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
    // The `data:text/javascript;base64,` on the return value of from `readAsDataURL` is used by this function's callers https://stackoverflow.com/a/57255653
  })
}

async function registerPluginService(
  c: RenderContainer,
  plugin: Plugin
): Promise<RenderContainer> {
  const script = await blobToBase64(plugin.script)
  const exports = (await import(/* @vite-ignore */ script)) as {
    default: RenderPluginExports
  }
  return getC(c, exports.default)
}

function getC(
  c: RenderContainer,
  exports: RenderPluginExports
): RenderContainer {
  if (exports.services === undefined) return c
  const rExports = exports.services(freeze(c, true))
  return {
    ...c,
    ...rExports,
  }
}

export async function registerPluginServices(
  plugins: Plugin[]
): Promise<RenderContainer> {
  const seed: RenderContainer = defaultRenderContainer
  const c = await plugins.reduce(async (prior, plugin) => {
    return await registerPluginService(await prior, plugin)
  }, Promise.resolve(seed))
  return c
}
