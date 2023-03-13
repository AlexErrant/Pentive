import {
  Base64Url,
  commentText,
  createRemoteNote,
  db,
  dbIdToBase64Url,
  editNotes,
  editRemoteNote,
  fromBase64Url,
  insertNoteChildComment,
  insertNoteComment,
  insertNotes,
  noteCommentId,
  remoteNoteId,
  subscribeToNote,
} from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
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
  createNote: authedProcedure
    .input(z.array(createRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertNotes(ctx.user, input)
      return remoteIdByLocal
    }),
  insertNoteComment: authedProcedure
    .input(z.object({ noteId: remoteNoteId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertNoteComment(input.noteId, input.text, ctx.user)
    }),
  insertNoteChildComment: authedProcedure
    .input(z.object({ parentCommentId: noteCommentId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertNoteChildComment(input.parentCommentId, input.text, ctx.user)
    }),
  subscribeToNote: authedProcedure
    .input(remoteNoteId)
    .mutation(async ({ input, ctx }) => {
      await subscribeToNote(ctx.user, input)
    }),
  editNote: authedProcedure
    .input(z.array(editRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => await editNotes(ctx.user, input)),
  getNote: publicProcedure.input(remoteNoteId).query(async ({ input }) => {
    const note = await db
      .selectFrom("Note")
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
      .selectFrom("Note")
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
    From<DB, "Note">,
    "Note",
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
