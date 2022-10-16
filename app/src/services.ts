import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  html,
  renderTemplate,
} from "./domain/cardHtml"
import { HTMLElementTagNameMap } from "./custom-elements/registry"

// the DI container. Stands for "Container, initial".
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Ci = {
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
}

export type Ct = typeof Ci

export interface PluginExports {
  services?: (c: Ct) => Partial<Ct>
  customElements?: Record<keyof HTMLElementTagNameMap, () => void> // highTODO is this really the best name you can come up with
}
