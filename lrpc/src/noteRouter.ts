import { createRemoteNote, remoteNote } from "./schemas/note.js"
import { id } from "./schemas/core.js"
import { z } from "zod"
import _ from "lodash"
import id128 from "id128"
import { Prisma, Note } from "@prisma/client"
import { authedProcedure, publicProcedure } from "./trpc.js"
import { prisma, ulidStringToBuffer, ulidToBuffer } from "./prisma.js"
import { optionMap } from "./core.js"
import { compile } from "html-to-text"

const convert = compile({})
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
  addNote: authedProcedure
    .input(
      z.object({
        nook: z.string(),
      })
    )
    .mutation(async (req) => {
      const id = ulid.generate()
      await prisma.note.create({
        data: {
          ...req.input,
          id: ulidToBuffer(id),
          templateId: ulidToBuffer(id),
          authorId: req.ctx.user,
          fieldValues: "fieldValues",
          fts: "fts",
          ankiId: 0,
          tags: "tags",
        },
      })
      return id.toCanonical()
    }),
  addNotes: authedProcedure
    .input(z.array(createRemoteNote))
    .mutation(async (req) => {
      const noteCreatesAndIds = req.input.map((t) => {
        const remoteId = ulid.generate()
        const t2: Prisma.NoteCreateManyInput = {
          ...t,
          fieldValues: JSON.stringify(t.fieldValues),
          fts: Object.values(t.fieldValues)
            .map(convert)
            .concat(t.tags)
            .join(" "),
          id: ulidToBuffer(remoteId),
          templateId: ulidStringToBuffer(t.templateId),
          tags: JSON.stringify(t.tags),
          authorId: req.ctx.user,
        }
        return [t2, [t.id, remoteId.toCanonical()] as [string, string]] as const
      })
      const noteCreates = noteCreatesAndIds.map((x) => x[0])
      const remoteIdByLocal = _.fromPairs(noteCreatesAndIds.map((x) => x[1]))
      await prisma.note.createMany({
        data: noteCreates,
      })
      return remoteIdByLocal
    }),
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
