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
	// highTODO needs authorization
	createNote: enticatedProcedure
		.input(z.array(createRemoteNote).min(1))
		.mutation(async ({ input, ctx }) => {
			const remoteIdByLocal = await insertNotes(ctx.user, input)
			return remoteIdByLocal
		}),
	editNote: enticatedProcedure
		.input(z.array(editRemoteNote).min(1))
		.mutation(async ({ input, ctx }) => {
			await editNotes(ctx.user, input)
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
