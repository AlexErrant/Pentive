import { ChildTemplateId, TemplateId } from "../../domain/ids"
import {
  ChildTemplate,
  Field,
  Template,
  TemplateType,
} from "../../domain/template"
import { throwExp } from "../../domain/utility"
import { Fld, Model, Models, Tmpl } from "./typeChecker"

function parseField(fld: Fld): Field {
  return {
    name: fld.name,
    rightToLeft: fld.rtl,
    sticky: fld.sticky,
  }
}

function parseChildTemplate(tmpl: Tmpl): ChildTemplate {
  return {
    id: tmpl.ord.toString() as ChildTemplateId, // medTODO
    name: tmpl.name,
    front: tmpl.qfmt,
    back: tmpl.afmt,
    shortFront: tmpl.bqfmt,
    shortBack: tmpl.bafmt,
  }
}

function parseTemplateType(model: Model): TemplateType {
  switch (model.type) {
    case 0:
      return {
        tag: "standard",
        templates: model.tmpls.map(parseChildTemplate),
      }
    case 1: {
      if (model.tmpls.length !== 1)
        throwExp(
          `Should be impossible! Cloze template have only 1 template, but got ${model.tmpls.length}`
        )
      const tmpl = model.tmpls[0]
      return {
        tag: "cloze",
        template: parseChildTemplate(tmpl),
      }
    }
    default:
      throwExp(
        `Should be impossible! Only 0 or 1 are possible model types, but got ${model.type}`
      )
  }
}

export function parseTemplates(models: Models): Template[] {
  return Object.values(models).map((m) => {
    return {
      id: m.id.toString() as TemplateId, // medTODO
      name: m.name,
      css: m.css,
      fields: m.flds.map(parseField),
      created: new Date(m.id),
      modified: new Date(m.mod * 1000),
      templateType: parseTemplateType(m),
    }
  })
}
