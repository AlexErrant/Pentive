/* eslint-disable @typescript-eslint/naming-convention */

// https://stackoverflow.com/a/72239265
// https://github.com/solidjs/solid/issues/616

import { customElement } from "solid-element"
import { Component } from "solid-js"

import Nav from "./nav"

class HTMLElementTagNameMap {
  "pentive-nav" = Nav
}

declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type ElementProps<T> = {
      [K in keyof T]: T[K] extends Component<infer P> ? P : never
    }

    interface IntrinsicElements extends ElementProps<HTMLElementTagNameMap> {}
  }
}

const registry = new HTMLElementTagNameMap()

for (const property in registry) {
  customElement(property, registry[property as keyof HTMLElementTagNameMap])
}
