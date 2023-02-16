import { NoteId } from "shared"
import z from "zod"

const noteId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<NoteId>

export const iByNoteIdsValidator = z.record(
  noteId,
  z.coerce.number().int().min(0).max(255)
)
