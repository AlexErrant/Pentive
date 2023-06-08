import { defaultRenderContainer } from "shared-dom"
import type { PentiveElement } from "./components/registry"
import Nav from "./components/nav"
import ExamplePlugin from "./components/examplePlugin"

export const domContainer = { nav: Nav, examplePlugin: ExamplePlugin }

// the dependency injection container
export const defaultContainer = {
  ...defaultRenderContainer,
  ...domContainer,
  // todo - add other (non-render) services
}

export type Container = typeof defaultContainer

export interface PluginExports {
  services?: (c: Container) => Partial<Container>
  customElements?: Record<PentiveElement, () => void> // highTODO is this really the best name you can come up with
}
