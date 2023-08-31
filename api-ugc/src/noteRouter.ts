import { remoteNoteId } from 'shared'
import { getNote, searchNotes } from 'shared-edge'
import { z } from 'zod'
import { publicProcedure } from './trpc'

export const noteRouter = {
	getNote: publicProcedure
		.input(remoteNoteId)
		.query(async ({ input, ctx }) => await getNote(input, ctx.user ?? null)),
	searchNotes: publicProcedure
		.input(z.string())
		.query(
			async ({ input, ctx }) => await searchNotes(input, ctx.user ?? null),
		),
}
