import { customElement } from "solid-element"
import { HTMLElementTagNameMap } from "./web-components/registry"

async function getConfig(): Promise<Record<string, string>> {
  const config = await fetch("/plugin-config.json")
  return (await config.json()) as Record<string, string>
}

const registry = new HTMLElementTagNameMap()

export async function registerWebComponents(): Promise<void> {
  const config = await getConfig()
  for (const property in registry) {
    if (config[property] === undefined) {
      customElement(property, registry[property as keyof HTMLElementTagNameMap])
    } else {
      let path = config[property]
      // Workaround for "Assets in public cannot be imported from JavaScript." from https://vitejs.dev/guide/assets.html#the-public-directory
      // Empirically works in `npm run dev` and `npm run build; npm run serve`
      if (import.meta.env.MODE === "development") {
        path = "../public" + path
      }
      await import(/* @vite-ignore */ path) // todo parallelize
    }
  }
}
