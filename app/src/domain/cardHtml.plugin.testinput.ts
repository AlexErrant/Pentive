import { Ct, PluginExports } from "../services"

function clozeTemplateRegex(c: Ct): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"),
    c.clozeTemplateRegex.flags
  )
}

const exports: PluginExports = {
  services: (c: Ct) => {
    return {
      clozeTemplateRegex: clozeTemplateRegex(c),
    }
  },
}
export default exports
