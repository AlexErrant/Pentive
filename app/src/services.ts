import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  html,
  renderTemplate,
} from "./domain/cardHtml"

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
  services: (c: Ct) => Partial<Ct>
}
