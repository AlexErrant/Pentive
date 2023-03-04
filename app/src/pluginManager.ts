import { freeze } from "immer"
import { PentiveElement } from "./customElements/registry"
import { Plugin } from "shared"
import { defaultContainer, Container, PluginExports } from "./services"

// https://stackoverflow.com/a/18650249
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob) // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
    // The `data:text/javascript;base64,` on the return value of from `readAsDataURL` is used by this function's callers https://stackoverflow.com/a/57255653
  })
}

// Some links for when we decide to support "hot" updates of custom elements
// https://github.com/WICG/webcomponents/issues/754 https://github.com/caridy/redefine-custom-elements https://stackoverflow.com/q/47805288 https://github.com/ryansolid/component-register#hot-module-replacement-new
// Be aware that it seems like it's impossible to unregister a custom element https://stackoverflow.com/q/27058648

type ElementRegistry = Partial<
  Record<PentiveElement, Array<[string, () => void]>>
> // [plugin's name, lazy registration] Lazy because you can't unregister a custom element.

function applyForElement(
  elementRegistry: ElementRegistry,
  element: PentiveElement,
  pluginName: string,
  register: () => void
): ElementRegistry {
  const olderRegistrations = elementRegistry[element] ?? []
  return {
    ...elementRegistry,
    [element]: [...olderRegistrations, [pluginName, register]],
  }
}

function resolveRegistrations(er: ElementRegistry): Set<string> {
  const registeredElements = Object.entries(er).map(
    ([elementName, applicants]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [pluginName, register] = applicants[0] // arbitrary pick the first applicant. highTODO handle multiple
      register()
      return elementName
    }
  )
  return new Set(registeredElements)
}

async function registerPluginService(
  [c, er]: [Container, ElementRegistry],
  plugin: Plugin
): Promise<[Container, ElementRegistry]> {
  const script = await blobToBase64(plugin.script)
  const exports = (await import(/* @vite-ignore */ script)) as {
    default: PluginExports
  }
  return [
    getC(c, exports.default),
    getElementRegistry(plugin.name, er, exports.default),
  ]
}

function getC(c: Container, exports: PluginExports): Container {
  if (exports.services === undefined) return c
  const rExports = exports.services(freeze(c, true))
  return {
    ...c,
    ...rExports,
  }
}

function getElementRegistry(
  pluginName: string,
  priorRegistry: ElementRegistry,
  exports: PluginExports
): ElementRegistry {
  return exports.customElements !== undefined
    ? Object.entries(exports.customElements).reduce(
        (priorEr, [element, register]) => {
          return applyForElement(
            priorEr,
            element as PentiveElement,
            pluginName,
            register
          )
        },
        priorRegistry
      )
    : priorRegistry
}

export async function registerPluginServices(
  plugins: Plugin[]
): Promise<[Container, Set<string>]> {
  const seed: [Container, ElementRegistry] = [defaultContainer, {}]
  const [c, er] = await plugins.reduce(async (prior, plugin) => {
    return await registerPluginService(await prior, plugin)
  }, Promise.resolve(seed))
  const registeredElements = resolveRegistrations(er)
  return [c, registeredElements]
}
