import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  html,
  renderTemplate,
  strip,
} from "./cardHtml.js"

export const defaultRenderContainer = {
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
  strip,
}

export const noteOrdsRenderContainer = {
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
  strip: (x: string) => x,
}

export type RenderContainer = typeof defaultRenderContainer

export interface RenderPluginExports {
  services?: (c: RenderContainer) => Partial<RenderContainer>
}
