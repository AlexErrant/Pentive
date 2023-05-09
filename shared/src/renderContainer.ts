import {
  body,
  clozeRegex,
  clozeTemplateRegex,
  simpleFieldReplacer,
  html,
  renderTemplate,
  strip,
} from "./cardHtml.js"

export const defaultRenderContainer = {
  simpleFieldReplacer,
  clozeRegex,
  clozeTemplateRegex,
  body,
  renderTemplate,
  html,
  strip,
}

export const noteOrdsRenderContainer = {
  ...defaultRenderContainer,
  strip: (x: string) => x,
}

export type RenderContainer = typeof defaultRenderContainer

export interface RenderPluginExports {
  services?: (c: RenderContainer) => Partial<RenderContainer>
}
