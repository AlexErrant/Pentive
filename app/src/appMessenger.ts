import { C } from "."
import { NoteId, Pointer, ResourceId, Side, TemplateId } from "./domain/ids"
import { db } from "./messenger"

async function renderBody(
  side: Side,
  templateId: TemplateId,
  noteId?: NoteId | null,
  pointer?: Pointer | null
): Promise<{ body: string; css?: string }> {
  if (noteId == null && pointer == null) {
    const template = await db.getTemplate(templateId)
    if (template === null)
      return {
        body: `Template ${templateId} not found.`,
      }
    const result = C.renderTemplate(template)[0] // nextTODO
    if (result == null) {
      return {
        body: `Error rendering Template ${templateId}: "${template.name}".`,
        css: template.css,
      }
    } else {
      return {
        body: side === "front" ? result[0] : result[1],
        css: template.css,
      }
    }
  } else if (noteId != null && pointer != null) {
    const note = await db.getNote(noteId) // nextTODO
  } else {
    return {
      body: "One of NoteId or Pointer is null, which should be impossible. Open a bug report if you see this!",
    }
  }
  return { body: "!!!" } // nextTODO
}

async function getLocalResource(id: ResourceId): Promise<Blob | undefined> {
  const r = await db.getResource(id)
  return r?.data
}

export const appExpose = {
  getLocalResource,
  renderBody,
}
