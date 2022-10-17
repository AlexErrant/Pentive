import { customElement } from "solid-element"
import type { Ct, PluginExports } from "../../../app/src/services"
import { Nav } from "./nav"

function clozeTemplateRegex(c: Ct): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "(?:edit:)?cloze:"),
    c.clozeTemplateRegex.flags
  )
}

const services = (c: Ct): Partial<Ct> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
  }
}

const exports: PluginExports = {
  services,
  customElements: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "pentive-nav": () => {
      customElement("pentive-nav", { navLinks: [] }, Nav)
    },
  },
}

export default exports
