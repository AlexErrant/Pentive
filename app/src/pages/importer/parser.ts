import {
  type CardId,
  type Ord,
  type NoteId,
  type TemplateId,
  type ChildTemplate,
  type TemplateType,
  throwExp,
} from "shared"
import { type Field, type Template } from "../../domain/template"
import { type Card as PCard } from "../../domain/card"
import { type Note as PNote } from "../../domain/note"
import {
  type Card as ACard,
  type Fld,
  type Model,
  type Models,
  type Note as ANote,
  type Tmpl,
} from "./typeChecker"
import _ from "lodash"
import { type CardSettingId, type DeckId } from "../../domain/ids"

function parseField(fld: Fld): Field {
  return {
    name: fld.name,
    rightToLeft: fld.rtl,
    sticky: fld.sticky,
  }
}

function parseChildTemplate(tmpl: Tmpl): ChildTemplate {
  return {
    id: tmpl.ord as Ord,
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
  return Object.entries(models).map(([, m]) => {
    return {
      id: m.id.toString() as TemplateId, // medTODO
      name: m.name,
      css: m.css,
      fields: m.flds.map(parseField),
      created: new Date(m.id),
      updated: new Date(m.mod * 1000),
      templateType: parseTemplateType(m),
      ankiId: m.id,
      remotes: new Map(),
    }
  })
}

export function parseNote(
  note: ANote,
  templates: Map<TemplateId, Template>
): PNote {
  const templateId = note.mid.toString() as TemplateId // medTODO
  const template = templates.get(templateId)
  if (template == null) throwExp(`Template ${templateId} not found`)
  const fields = template.fields.map((f) => f.name)
  const values = note.flds.split("\x1f")
  if (fields.length !== values.length)
    throwExp(
      `The length of fields (${fields.length}) and values (${values.length}) for noteId=${note.id} don't match.`
    )
  return {
    id: note.id.toString() as NoteId, // medTODO
    created: new Date(note.id),
    updated: new Date(note.mod),
    ankiNoteId: note.id,
    templateId,
    fieldValues: new Map(_.zip(fields, values) as Array<[string, string]>),
    tags: new Set(
      note.tags
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t !== "")
    ),
    remotes: new Map(),
  }
}

export function parseCard(
  card: ACard,
  notes: Map<number, PNote>,
  templates: Map<TemplateId, Template>
): PCard {
  const note = notes.get(card.nid)
  if (note == null) throwExp(`Note ${card.nid} not found`)
  const template = templates.get(note.templateId)
  if (template == null) throwExp(`Template ${note.templateId} not found`)
  return {
    id: card.id.toString() as CardId, // medTODO
    noteId: card.nid.toString() as NoteId, // medTODO
    deckIds: new Set([card.did.toString() as DeckId]), // medTODO
    created: new Date(card.id),
    updated: new Date(card.mod),
    due: new Date(card.due), // highTODO
    cardSettingId: card.did.toString() as CardSettingId, // medTODO
    ord: card.ord,
  }
}
