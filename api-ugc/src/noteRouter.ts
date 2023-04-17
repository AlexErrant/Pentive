import {
  Base64Url,
  db,
  dbIdToBase64Url,
  fromBase64Url,
  remoteNoteId,
} from "shared"
import { z } from "zod"
import { publicProcedure } from "./trpc"
import { DB, Note } from "shared/src/database"
import { Selection, sql } from "kysely"
import { From } from "kysely/dist/cjs/parser/table-parser"

type ClientNote = Omit<
  Note,
  | "id"
  | "templateId"
  | "fts"
  | "created"
  | "updated"
  | "subscribersCount"
  | "commentsCount"
> & {
  id: Base64Url
  templateId: Base64Url
  created: Date
  updated: Date
  subscribersCount: number
  commentsCount: number
}

export const noteRouter = {
  getNote: publicProcedure.input(remoteNoteId).query(async ({ input }) => {
    const note = await db
      .selectFrom("note")
      .select([
        "id",
        "templateId",
        "created",
        "updated",
        "authorId",
        "fieldValues",
        // "fts",
        "tags",
        "ankiId",
        "commentsCount",
        "subscribersCount",
      ])
      .where("id", "=", fromBase64Url(input))
      .executeTakeFirst()
    if (note == null) {
      return undefined
    }
    return mapNote(note)
  }),
  searchNotes: publicProcedure.input(z.string()).query(async ({ input }) => {
    const notes = await db
      .selectFrom("note")
      .select([
        "id",
        "templateId",
        "created",
        "updated",
        "authorId",
        "fieldValues",
        // "fts",
        "tags",
        "ankiId",
        "commentsCount",
        "subscribersCount",
      ])
      .where(sql`MATCH(fts) AGAINST (${input} IN NATURAL LANGUAGE MODE)`)
      .execute()
    return notes.map(mapNote)
  }),
}

function mapNote(
  note: Selection<
    From<DB, "note">,
    "note",
    | "templateId"
    | "fieldValues"
    | "tags"
    | "ankiId"
    | "id"
    | "created"
    | "updated"
    | "authorId"
    | "commentsCount"
    | "subscribersCount"
  >
) {
  const r: ClientNote = {
    ...note,
    id: dbIdToBase64Url(note.id),
    templateId: dbIdToBase64Url(note.templateId),
  }
  return r
}