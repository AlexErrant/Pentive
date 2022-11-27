import { z } from "zod"
import { createRemoteTemplate, remoteTemplate } from "./schemas/template"
import { id } from "./schemas/core"
import _ from "lodash"
import { Ulid } from "id128"
import { Prisma, Template } from "@prisma/client"
import { protectedProcedure, publicProcedure, router } from "./trpc"
import { prisma, ulidStringToBuffer, ulidToBuffer } from "./prisma"

export interface ClientTemplate {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  nook: string
  authorId: string
  type: string
  fields: string
  css: string
  childTemplates: string
  ankiId: bigint | null
}

function mapTemplate(t: Template): ClientTemplate {
  const id = Ulid.fromRaw(t.id.toString("hex")).toCanonical()
  return { ...t, id }
}

export const appRouter = router({
  greeting: publicProcedure
    .input(z.string())
    .query(({ input }) => `hello ${input}!`),
  addTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async (req) => {
      const id = Ulid.generate()
      await prisma.template.create({
        data: {
          ...req.input,
          id: ulidToBuffer(id),
          nook: "nook",
          authorId: req.ctx.user,
          type: "type",
          fields: "fields",
          css: "css",
          childTemplates: "childTemplates",
          ankiId: 0,
        },
      })
      return id.toCanonical()
    }),
  addTemplates: protectedProcedure
    .input(z.array(createRemoteTemplate))
    .mutation(async (req) => {
      const templateCreatesAndIds = req.input.map(({ templateType, ...t }) => {
        const remoteId = Ulid.generate()
        const t2: Prisma.TemplateCreateManyInput = {
          ...t,
          type: templateType,
          fields: JSON.stringify(t.fields),
          id: ulidToBuffer(remoteId),
          authorId: req.ctx.user,
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
    if (template != null) {
      return mapTemplate(template)
    }
    return template
  }),
  getTemplates: publicProcedure.input(z.array(id)).query(async (req) => {
    const r = await prisma.template.findMany({
      where: { id: { in: req.input.map(ulidStringToBuffer) } },
    })
    return r.map(mapTemplate)
  }),
})

export type AppRouter = typeof appRouter
