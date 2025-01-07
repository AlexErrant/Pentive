import { z } from 'zod'
import { enticatedProcedure } from './trpc'
import {
	commentId,
	commentText,
	createRemoteTemplate,
	editRemoteTemplate,
	remoteTemplateId,
} from 'shared/schema'
import {
	editTemplates,
	insertTemplates,
	insertTemplateComment,
	subscribeToTemplate,
	insertTemplateChildComment,
} from 'shared-edge'

// When writing a `procedure.query`, ensure it doesn't return HTML!
// That code belongs in api-ugc
export const templateRouter = {
	//

	// nook moderator mutations
	// highTODO needs authorization
	createTemplates: enticatedProcedure
		.input(z.array(createRemoteTemplate).min(1))
		.mutation(async ({ input, ctx }) => {
			const remoteIdByLocal = await insertTemplates(ctx.user, input)
			return remoteIdByLocal
		}),
	editTemplates: enticatedProcedure
		.input(z.array(editRemoteTemplate).min(1))
		.mutation(async ({ input, ctx }) => {
			await editTemplates(ctx.user, input)
		}),

	subscribeToTemplate: enticatedProcedure
		.input(remoteTemplateId)
		.mutation(async ({ input, ctx }) => {
			await subscribeToTemplate(ctx.user, input)
		}),
	insertTemplateComment: enticatedProcedure
		.input(z.object({ templateId: remoteTemplateId, text: commentText }))
		.mutation(async ({ input, ctx }) => {
			await insertTemplateComment(input.templateId, input.text, ctx.user)
		}),
	insertTemplateChildComment: enticatedProcedure
		.input(z.object({ parentCommentId: commentId, text: commentText }))
		.mutation(async ({ input, ctx }) => {
			await insertTemplateChildComment(
				input.parentCommentId,
				input.text,
				ctx.user,
			)
		}),
}
