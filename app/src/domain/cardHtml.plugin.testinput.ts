// npx tsc .\cardHtml.plugin.testinput.ts
import { Ct, PluginExports } from "../services"

function clozeTemplateRegex(c: Ct): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"),
    c.clozeTemplateRegex.flags
  )
}

const services = (c: Ct): Partial<Ct> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
    renderTemplate: function (template) {
      const original = c.renderTemplate.bind(this)(template)
      return original.map((x) =>
        x !== null ? ([x[0].toUpperCase(), x[1].toUpperCase()] as const) : null
      )
    },
  }
}

const exports: PluginExports = {
  services,
}

export default exports
