import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  html,
  renderTemplate,
} from "./domain/cardHtml"

// the DI container
export const C = {
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
}

export type Ct = typeof C

export interface PluginExports {
  services: (c: Ct) => Partial<Ct>
}
