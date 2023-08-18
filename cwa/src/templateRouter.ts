import { z } from "zod"
import { authedProcedure, publicProcedure } from "./trpc"
import {
  commentId,
  commentText,
  createRemoteTemplate,
  editRemoteTemplate,
  remoteTemplateId,
} from "shared"
import {
  editTemplates,
  insertTemplates,
  insertTemplateComment,
  subscribeToTemplate,
  insertTemplateChildComment,
  getTemplate,
} from "shared-edge"
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the emitted types
import type * as edge from "shared-edge"

export const templateRouter = {
  getTemplate: publicProcedure
    .input(remoteTemplateId)
    .query(async ({ input }) => await getTemplate(input)),
  createTemplates: authedProcedure
    .input(z.array(createRemoteTemplate).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertTemplates(ctx.user, input)
      return remoteIdByLocal
    }),
  editTemplates: authedProcedure
    .input(z.array(editRemoteTemplate).min(1))
    .mutation(async ({ input, ctx }) => {
      await editTemplates(ctx.user, input)
    }),
  subscribeToTemplate: authedProcedure
    .input(remoteTemplateId)
    .mutation(async ({ input, ctx }) => {
      await subscribeToTemplate(ctx.user, input)
    }),
  insertTemplateComment: authedProcedure
    .input(z.object({ templateId: remoteTemplateId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertTemplateComment(input.templateId, input.text, ctx.user)
    }),
  insertTemplateChildComment: authedProcedure
    .input(z.object({ parentCommentId: commentId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertTemplateChildComment(
        input.parentCommentId,
        input.text,
        ctx.user
      )
    }),
}
