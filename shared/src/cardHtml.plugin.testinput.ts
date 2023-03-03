// npx tsc .\cardHtml.plugin.testinput.ts
import {
  defaultRenderContainer,
  RenderContainer,
  RenderPluginExports,
} from "./renderContainer"

function clozeTemplateRegex(c: RenderContainer): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"),
    c.clozeTemplateRegex.flags
  )
}

function renderTemplate(
  c: RenderContainer
): typeof defaultRenderContainer.renderTemplate {
  return function (template) {
    const original = c.renderTemplate.bind(this)(template)
    return original.map((x) =>
      x !== null ? ([x[0].toUpperCase(), x[1].toUpperCase()] as const) : null
    )
  }
}

const services = (c: RenderContainer): Partial<RenderContainer> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
    renderTemplate: renderTemplate(c),
  }
}

const exports: RenderPluginExports = {
  services,
}

export default exports
