import {
  Base64Url,
  createRemoteNote,
  editNotes,
  editRemoteNote,
  id,
  insertNotes,
  mapDbIdsToBase64Url,
} from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import { Note } from "shared/src/database"

type ClientNote = Omit<Note, "id" | "templateId" | "fts"> & {
  id: Base64Url
  templateId: Base64Url
}

export function mapNote({ fts, ...t }: Note): ClientNote {
  return mapDbIdsToBase64Url(t, ["id", "templateId"])
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
  getNote: publicProcedure.input(id).query(async (req) => {
    const id = ulidStringToBuffer(req.input)
    const note = await prisma.note.findUnique({ where: { id } })
    return optionMap(note, mapNote)
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
