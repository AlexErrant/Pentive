import {
  CardId,
  CardSettingId,
  DeckId,
  ChildTemplateId,
  NoteId,
  TemplateId,
  ClozeIndex,
} from "../../domain/ids"
import {
  ChildTemplate,
  Field,
  Template,
  TemplateType,
} from "../../domain/template"
import { throwExp } from "../../domain/utility"
import { Card as PCard } from "../../domain/card"
import { Note as PNote } from "../../domain/note"
import {
  Card as ACard,
  Fld,
  Model,
  Models,
  Note as ANote,
  Tmpl,
} from "./typeChecker"

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

export function parseNote(
  note: ANote,
  templates: Record<TemplateId, Template>
): PNote {
  const templateId = note.mid.toString() as TemplateId // medTODO
  return {
    id: note.id.toString() as NoteId, // medTODO
    created: new Date(note.id),
    modified: new Date(note.mod),
    ankiNoteId: note.id,
    templateId,
    fields: templates[templateId].fields.map((f) => f.name),
    values: note.flds.split("\x1f"),
    tags: new Set(note.tags.split(" ")),
  }
}

export function parseCard(
  card: ACard,
  notes: Record<number, PNote>,
  templates: Record<TemplateId, Template>
): PCard {
  const note = notes[card.nid]
  const template = templates[note.templateId]
  const pointer =
    template.templateType.tag === "standard"
      ? (card.ord.toString() as ChildTemplateId)
      : (card.ord as ClozeIndex)
  return {
    id: card.id.toString() as CardId, // medTODO
    noteId: card.nid.toString() as NoteId, // medTODO
    deckIds: new Set([card.did.toString() as DeckId]), // medTODO
    created: new Date(card.id),
    modified: new Date(card.mod),
    due: new Date(card.due), // highTODO
    cardSettingId: card.did.toString() as CardSettingId, // medTODO
    pointer,
  }
}
