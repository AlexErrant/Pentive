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
