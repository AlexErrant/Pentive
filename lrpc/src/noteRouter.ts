import { id } from "./schemas/core.js"
import { z } from "zod"
import id128 from "id128"
import { Note } from "@prisma/client"
import { publicProcedure } from "./trpc.js"
import { prisma, ulidStringToBuffer } from "./prisma.js"
import { optionMap } from "./core.js"

const ulid = id128.Ulid

type ClientNote = Omit<Note, "id" | "templateId" | "fts"> & {
  id: string
  templateId: string
}

function mapNote({ fts, ...t }: Note): ClientNote {
  const id = ulid.fromRaw(t.id.toString("hex")).toCanonical()
  const templateId = ulid.fromRaw(t.templateId.toString("hex")).toCanonical()
  return { ...t, id, templateId }
}

export const noteRouter = {
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
