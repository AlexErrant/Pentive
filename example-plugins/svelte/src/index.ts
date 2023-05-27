import type { Container, PluginExports } from "app/lib/src/services"
import App from "./App.svelte"

function clozeTemplateRegex(c: Container): RegExp {
  return new RegExp(
    c.clozeTemplateRegex.source.replace("cloze:", "(?:edit:)?cloze:"),
    c.clozeTemplateRegex.flags
  )
}

const services = (c: Container): Partial<Container> => {
  return {
    clozeTemplateRegex: clozeTemplateRegex(c),
    standardReplacers: new Map(c.standardReplacers).set(
      "editFieldReplacer",
      ({ initialValue, isFront, card, note, template }) => {
        let r = initialValue
        note.fieldValues.forEach((value, fieldName) => {
          r = r.replace(new RegExp(`{{(?:edit:)?${fieldName}}}`), value)
        })
        return r
      }
    ),
    clozeReplacers: new Map(c.clozeReplacers).set(
      "editFieldReplacer",
      ({ initialValue, isFront, card, note, template }) => {
        let r = initialValue
        note.fieldValues.forEach((value, fieldName) => {
          r = r.replace(new RegExp(`{{(?:edit:)?${fieldName}}}`), value)
        })
        return r
      }
    ),
    nav: (p) => {
      const div = document.createElement("div")
      // eslint-disable-next-line no-new -- svelte API requires that we side effect
      new App({
        target: div,
        props: { navLinks: p.navLinks },
      })
      return div
    },
  }
}

const exports: PluginExports = {
  services,
}

export default exports
