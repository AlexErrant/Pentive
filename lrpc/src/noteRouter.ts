import { createRemoteNote, remoteNote } from "./schemas/note"
import { id } from "./schemas/core"
import { z } from "zod"
import _ from "lodash"
import { Ulid } from "id128"
import { Prisma, Note } from "@prisma/client"
import { authedProcedure, publicProcedure } from "./trpc"
import { prisma, ulidStringToBuffer, ulidToBuffer } from "./prisma"
import { optionMap } from "./core"

type ClientNote = Omit<Omit<Note, "id">, "templateId"> & {
  id: string
  templateId: string
}

function mapNote(t: Note): ClientNote {
  const id = Ulid.fromRaw(t.id.toString("hex")).toCanonical()
  const templateId = Ulid.fromRaw(t.templateId.toString("hex")).toCanonical()
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
      const id = Ulid.generate()
      await prisma.note.create({
        data: {
          ...req.input,
          id: ulidToBuffer(id),
          templateId: ulidToBuffer(id),
          authorId: req.ctx.user,
          fieldValues: "fieldValues",
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
        const remoteId = Ulid.generate()
        const t2: Prisma.NoteCreateManyInput = {
          ...t,
          fieldValues: JSON.stringify(t.fieldValues),
          id: ulidToBuffer(remoteId),
          templateId: ulidStringToBuffer(t.templateId),
          tags: "tags",
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
}
