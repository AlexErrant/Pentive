import { customElement } from "solid-element"
import { PluginExports } from "../../../app/src/services"
import { Nav } from "./nav"

const exports: PluginExports = {
  customElements: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "pentive-nav": () => {
      customElement("pentive-nav", { navLinks: [] }, Nav)
    },
  },
}

export default exports
