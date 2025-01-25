import {
	commentText,
	createRemoteNote,
	editRemoteNote,
	commentId,
	remoteNoteId,
} from 'shared/schema'
import { z } from 'zod'
import { enticatedProcedure } from './trpc'
import {
	assertIsMod,
	editNotes,
	insertNoteChildComment,
	insertNoteComment,
	insertNotes,
	subscribeToNote,
} from 'shared-edge'

// When writing a `procedure.query`, ensure it doesn't return HTML!
// That code belongs in api-ugc
export const noteRouter = {
	//

	// nook moderator mutations
	// all methods needs authorization!
	createNote: enticatedProcedure
		.input(z.array(createRemoteNote).min(1))
		.mutation(async ({ input, ctx }) => {
			const templateIds = [
				...new Set(input.flatMap((t) => t.remoteTemplateIds)),
			]
			await assertIsMod({ templateIds }, ctx.user)
			const remoteIdByLocal = await insertNotes(ctx.user, input)
			return remoteIdByLocal
		}),
	editNote: enticatedProcedure
		.input(z.array(editRemoteNote).min(1))
		.mutation(async ({ input, ctx }) => {
			const templateIds = [
				...new Set(input.flatMap((t) => Array.from(t.remoteIds.values()))),
			]
			await assertIsMod({ templateIds }, ctx.user)
			const remoteIdByLocal = await editNotes(ctx.user, input)
			return remoteIdByLocal
		}),

	subscribeToNote: enticatedProcedure
		.input(remoteNoteId)
		.mutation(async ({ input, ctx }) => {
			await subscribeToNote(ctx.user, input)
		}),
	insertNoteComment: enticatedProcedure
		.input(z.object({ noteId: remoteNoteId, text: commentText }))
		.mutation(async ({ input, ctx }) => {
			await insertNoteComment(input.noteId, input.text, ctx.user)
		}),
	insertNoteChildComment: enticatedProcedure
		.input(z.object({ parentCommentId: commentId, text: commentText }))
		.mutation(async ({ input, ctx }) => {
			await insertNoteChildComment(input.parentCommentId, input.text, ctx.user)
		}),
}
