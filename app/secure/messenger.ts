import * as Comlink from "comlink"

function add(a: number, b: number): number {
  return a + b
}

Comlink.expose(add, Comlink.windowEndpoint(self.parent))
