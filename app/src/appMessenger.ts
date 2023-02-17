import _ from "lodash"
import { C } from "."
import { CardId, NoteId, MediaId, Side, TemplateId } from "./domain/ids"
import { assertNever, throwExp } from "shared"
import { db } from "./db"

export type RenderBodyInput =
  | {
      readonly tag: "template"
      readonly side: Side
      readonly templateId: TemplateId
      readonly index: string // string due to `new URLSearchParams()`, which expects everything to be a string.
    }
  | {
      readonly tag: "card"
      readonly side: Side
      readonly templateId: TemplateId
      readonly noteId: NoteId
      readonly cardId: CardId
    }

async function renderBody(
  i: RenderBodyInput
): Promise<{ body: string; css?: string }> {
  switch (i.tag) {
    case "template": {
      const template = await db.getTemplate(i.templateId)
      if (template == null)
        return {
          body: `Template ${i.templateId} not found.`,
        }
      const result = C.renderTemplate(template)[parseInt(i.index)]
      if (result == null) {
        return {
          body: `Error rendering Template ${i.templateId}: "${template.name}".`,
          css: template.css,
        }
      } else {
        return {
          body: i.side === "front" ? result[0] : result[1],
          css: template.css,
        }
      }
    }
    case "card": {
      const template = await db.getTemplate(i.templateId)
      const note = await db.getNote(i.noteId)
      const card = await db.getCard(i.cardId)
      if (template == null) {
        return { body: `Template ${i.templateId} not found!` }
      }
      if (note == null) {
        return { body: `Note ${i.noteId} not found!` }
      }
      if (card == null) {
        return { body: `Card ${i.cardId} not found!` }
      }
      const fv = _.zip(
        Object.keys(note.fieldValues),
        Object.values(note.fieldValues)
      ) as ReadonlyArray<readonly [string, string]>
      const { front, back } =
        template.templateType.tag === "standard"
          ? template.templateType.templates.find(
              (t) => t.id === card.pointer
            ) ??
            throwExp(
              `Invalid pointer ${card.pointer} for template ${template.id}`
            )
          : template.templateType.template
      const frontBack = C.html(fv, front, back, card.pointer, template.css)
      if (frontBack == null) {
        return { body: "Card is invalid!" }
      }
      const body = i.side === "front" ? frontBack[0] : frontBack[1]
      return { body }
    }
    default:
      return assertNever(i)
  }
}

async function getLocalResource(id: MediaId): Promise<ArrayBuffer | null> {
  const resource = await db.getResource(id)
  return resource?.data ?? null
}

export const appExpose = {
  getLocalResource,
  renderBody,
}
