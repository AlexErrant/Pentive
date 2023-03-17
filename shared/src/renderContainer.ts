import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  html,
  renderTemplate,
} from "./cardHtml.js"

export const defaultRenderContainer = {
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
}

export type RenderContainer = typeof defaultRenderContainer

export interface RenderPluginExports {
  services?: (c: RenderContainer) => Partial<RenderContainer>
}
