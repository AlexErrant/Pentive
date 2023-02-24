import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import {
  Base64Url,
  createRemoteTemplate,
  db,
  dbIdToBase64Url,
  editRemoteTemplate,
  editTemplates,
  fromBase64Url,
  insertTemplates,
  remoteTemplateId,
} from "shared"
import { Selection } from "kysely"
import { From } from "kysely/dist/cjs/parser/table-parser"
import { DB, Template } from "shared/src/database"

type ClientTemplate = Omit<Template, "id" | "createdAt" | "updatedAt"> & {
  id: Base64Url
  createdAt: Date
  updatedAt: Date
}

export const templateRouter = {
  createTemplates: authedProcedure
    .input(z.array(createRemoteTemplate).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertTemplates(ctx.user, input)
      return remoteIdByLocal
    }),
  editTemplates: authedProcedure
    .input(z.array(editRemoteTemplate).min(1))
    .mutation(async ({ input, ctx }) => await editTemplates(ctx.user, input)),
  getTemplate: publicProcedure
    .input(remoteTemplateId)
    .query(async ({ input }) => {
      const template = await db
        .selectFrom("Template")
        .select([
          "id",
          "createdAt",
          "updatedAt",
          "name",
          "nook",
          "type",
          "fields",
          "css",
          "ankiId",
        ])
        .where("id", "=", fromBase64Url(input))
        .executeTakeFirst()
      if (template == null) {
        return undefined
      }
      return mapTemplate(template)
    }),
  getTemplates: publicProcedure
    .input(z.array(remoteTemplateId))
    .query(async ({ input }) => {
      const templates = await db
        .selectFrom("Template")
        .select([
          "id",
          "createdAt",
          "updatedAt",
          "name",
          "nook",
          "type",
          "fields",
          "css",
          "ankiId",
        ])
        .where("id", "in", input.map(fromBase64Url))
        .execute()
      return templates.map(mapTemplate)
    }),
}

function mapTemplate(
  note: Selection<
    From<DB, "Template">,
    "Template",
    | "name"
    | "nook"
    | "type"
    | "id"
    | "fields"
    | "css"
    | "ankiId"
    | "createdAt"
    | "updatedAt"
  >
) {
  const r: ClientTemplate = {
    ...note,
    id: dbIdToBase64Url(note.id),
  }
  return r
}
