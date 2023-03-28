import { publicProcedure } from "./trpc"
import { getTemplate, remoteTemplateId } from "shared"

export const templateRouter = {
  getTemplate: publicProcedure
    .input(remoteTemplateId)
    .query(async ({ input }) => await getTemplate(input)),
}
