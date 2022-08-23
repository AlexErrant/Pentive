/* eslint-disable @typescript-eslint/naming-convention */

// https://stackoverflow.com/a/72239265
// https://github.com/solidjs/solid/issues/616

import { Component } from "solid-js"

import Nav from "./nav"

export class HTMLElementTagNameMap {
  readonly "pentive-nav" = Nav
}

declare module "solid-js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type ElementProps<T> = {
      readonly [K in keyof T]: T[K] extends Component<infer P> ? P : never
    }

    interface IntrinsicElements extends ElementProps<HTMLElementTagNameMap> {}
  }
}
