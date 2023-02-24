import { createRemoteTemplate, id } from "shared"
import { z } from "zod"
import _ from "lodash"
import id128 from "id128"
import { Prisma, Template } from "@prisma/client"
import { authedProcedure, publicProcedure } from "./trpc.js"
import { prisma, ulidStringToBuffer, ulidToBuffer } from "./prisma.js"
import { optionMap } from "./core.js"

const ulid = id128.Ulid

type ClientTemplate = Omit<Template, "id"> & { id: string }

function mapTemplate(t: Template): ClientTemplate {
  const id = ulid.fromRaw(t.id.toString("hex")).toCanonical()
  return { ...t, id }
}

export const templateRouter = {
  addTemplate: authedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async (req) => {
      const id = ulid.generate()
      await prisma.template.create({
        data: {
          ...req.input,
          id: ulidToBuffer(id),
          nook: "nook",
          type: "type",
          fields: "fields",
          css: "css",
          ankiId: 0,
        },
      })
      return id.toCanonical()
    }),
  addTemplates: authedProcedure
    .input(z.array(createRemoteTemplate))
    .mutation(async (req) => {
      const templateCreatesAndIds = req.input.map(({ templateType, ...t }) => {
        const remoteId = ulid.generate()
        const t2: Prisma.TemplateCreateManyInput = {
          ...t,
          type: templateType,
          fields: JSON.stringify(t.fields),
          id: ulidToBuffer(remoteId),
        }
        return [t2, [t.id, remoteId.toCanonical()] as [string, string]] as const
      })
      const templateCreates = templateCreatesAndIds.map((x) => x[0])
      const remoteIdByLocal = _.fromPairs(
        templateCreatesAndIds.map((x) => x[1])
      )
      await prisma.template.createMany({
        data: templateCreates,
      })
      return remoteIdByLocal
    }),
  getTemplate: publicProcedure.input(id).query(async (req) => {
    const id = ulidStringToBuffer(req.input)
    const template = await prisma.template.findUnique({ where: { id } })
    return optionMap(template, mapTemplate)
  }),
  getTemplates: publicProcedure.input(z.array(id)).query(async (req) => {
    const r = await prisma.template.findMany({
      where: { id: { in: req.input.map(ulidStringToBuffer) } },
    })
    return r.map(mapTemplate)
  }),
}
