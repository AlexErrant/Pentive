import { Plugin } from "./domain/plugin"
import { Ci, Ct, PluginExports } from "./services"

// https://stackoverflow.com/a/18650249
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob) // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
  })
}

// Some links for when we decide to support "hot" updates of custom elements
// https://github.com/WICG/webcomponents/issues/754 https://github.com/caridy/redefine-custom-elements https://stackoverflow.com/q/47805288
// Be aware that it seems like it's impossible to unregister a custom element https://stackoverflow.com/q/27058648

export async function registerCustomElements(
  plugins: Plugin[]
): Promise<Set<string>> {
  const registerCustomElementPromises = plugins // highTODO ensure there are no custom elements with the same name
    .filter((x) => x.type.tag === "custom-element")
    .map(async (p) => {
      const script = await blobToBase64(p.script)
      await import(/* @vite-ignore */ script) // The `data:text/javascript;base64,` on `script` from `readAsDataURL` is important https://stackoverflow.com/a/57255653
      return p.type.name
    })
  const registeredNames = await Promise.all(registerCustomElementPromises)
  return new Set(registeredNames)
}

async function registerPluginService(c: Ct, plugin: Plugin): Promise<Ct> {
  const script = await blobToBase64(plugin.script)
  const exports = (await import(/* @vite-ignore */ script)) as PluginExports // The `data:text/javascript;base64,` on `script` from `readAsDataURL` is important https://stackoverflow.com/a/57255653
  const rExports = exports.services(c)
  return {
    ...c,
    ...rExports,
  }
}

export async function registerPluginServices(plugins: Plugin[]): Promise<Ct> {
  return await plugins
    .filter((x) => x.type.tag === "function")
    .reduce(async (previousC, plugin) => {
      return await registerPluginService(await previousC, plugin)
    }, Promise.resolve(Ci))
}
