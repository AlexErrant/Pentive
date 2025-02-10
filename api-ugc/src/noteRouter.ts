import { getNote, searchNotes } from 'shared-edge'
import { z } from 'zod'
import { publicProcedure } from './trpc'
import type { UserId } from 'shared/brand'
import { remoteNoteId } from 'shared/schema'
import type { Result } from 'shared/result'

function getUser(result: Result<UserId, string>) {
	return result.tag === 'Ok' ? result.ok : null
}

export const noteRouter = {
	getNote: publicProcedure
		.input(remoteNoteId)
		.query(async ({ input, ctx }) => await getNote(input, getUser(ctx.user))),
	searchNotes: publicProcedure
		.input(z.string())
		.query(
			async ({ input, ctx }) => await searchNotes(input, getUser(ctx.user)),
		),
}
