import {
  Base64Url,
  createRemoteNote,
  db,
  dbIdToBase64Url,
  editNotes,
  editRemoteNote,
  fromBase64Url,
  insertNotes,
  remoteNoteId,
} from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import { Note } from "shared/src/database"

type ClientNote = Omit<
  Note,
  "id" | "templateId" | "fts" | "createdAt" | "updatedAt"
> & {
  id: Base64Url
  templateId: Base64Url
  createdAt: Date
  updatedAt: Date
}

export const noteRouter = {
  createNote: authedProcedure
    .input(z.array(createRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertNotes(ctx.user, input)
      return remoteIdByLocal
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
        "createdAt",
        "updatedAt",
        "authorId",
        "fieldValues",
        // "fts",
        "tags",
        "ankiId",
      ])
      .where("id", "=", fromBase64Url(input))
      .executeTakeFirst()
    if (note == null) {
      return undefined
    }
    const r: ClientNote = {
      ...note,
      id: dbIdToBase64Url(note.id),
      templateId: dbIdToBase64Url(note.templateId),
    }
    return r
  }),
  getNotes: publicProcedure.input(z.array(id)).query(async (req) => {
    const r = await prisma.note.findMany({
      where: { id: { in: req.input.map(ulidStringToBuffer) } },
    })
    return r.map(mapNote)
  }),
  searchNotes: publicProcedure.input(z.string()).query(async (req) => {
    const r = await prisma.note.findMany({
      where: { fts: { search: req.input } },
    })
    return r.map(mapNote)
  }),
}
