// npx tsc .\cardHtml.plugin.testinput.ts
import { C, Ct, PluginExports } from "../services"

function clozeTemplateRegex(c: Ct): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"),
    c.clozeTemplateRegex.flags
  )
}

function renderTemplate(c: Ct): typeof C.renderTemplate {
  return function (template) {
    const original = c.renderTemplate.bind(this)(template)
    return original.map((x) =>
      x !== null ? ([x[0].toUpperCase(), x[1].toUpperCase()] as const) : null
    )
  }
}

const services = (c: Ct): Partial<Ct> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
    renderTemplate: renderTemplate(c),
  }
}

const exports: PluginExports = {
  services,
}

export default exports
