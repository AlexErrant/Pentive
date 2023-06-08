import { freeze } from "immer"
import type { PentiveElement } from "./components/registry"
import { blobToBase64, type Plugin } from "shared-dom"
import {
  defaultContainer,
  type Container,
  type PluginExports,
} from "./services"

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
  // A limitation of this import is that it won't resolve other files in the npmPackage.tgz
  // Does addressing this even make sense? What if two plugins have a `react.js`?
  // Also, the Plugin table currently only stores a single `script` per Plugin. If we add support for more than 1 file,
  // we should consider storing the npmPackage.tgz in sqlite. However, generating npmPackage.tgz for tests (cardHtml.plugin.test.ts)
  // is *extremely* annoying, because we use DecompressionStream which only works in browsers,
  // and jsdom doesn't support streams https://github.com/jsdom/jsdom/pull/3200
  // grep 2D96EE4E-61BA-4FCA-93C1-863C80E10A93
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
