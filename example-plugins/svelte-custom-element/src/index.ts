import type { Container, PluginExports } from "../../../app/src/services"
import App from "./App.svelte"

function clozeTemplateRegex(c: Container): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "(?:edit:)?cloze:"),
    c.clozeTemplateRegex.flags
  )
}

const services = (c: Container): Partial<Container> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
  }
}

const exports: PluginExports = {
  services,
  customElements: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "pentive-nav": () => {
      customElements.define(
        "pentive-nav",
        App as unknown as CustomElementConstructor // ¯\_(ツ)_/¯ as per https://svelte.dev/docs#run-time-custom-element-api:~:text=customElements.define(%27my%2Delement%27%2C%20MyElement)%3B
      )
    },
  },
}

export default exports
