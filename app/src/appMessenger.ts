import { C } from "."
import {
  ChildTemplateId,
  NoteId,
  ResourceId,
  Side,
  TemplateId,
} from "./domain/ids"
import { assertNever } from "./domain/utility"
import { db } from "./messenger"

export type RenderBodyInput =
  | {
      readonly tag: "template"
      readonly side: Side
      readonly templateId: TemplateId
    }
  | {
      readonly tag: "card"
      readonly noteId: NoteId
      readonly pointer: ChildTemplateId | string // string is when its a clozeIndex. Necessary for `new URLSearchParams()`, which expects everything to be a string.
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
      const result = C.renderTemplate(template)[0] // nextTODO
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
      const note = await db.getNote(i.noteId)
      return { body: "!!!" } // nextTODO
    }
    default:
      return assertNever(i)
  }
}

async function getLocalResource(id: ResourceId): Promise<Blob | undefined> {
  const r = await db.getResource(id)
  return r == null ? undefined : new Blob([r.data])
}

export const appExpose = {
  getLocalResource,
  renderBody,
}
