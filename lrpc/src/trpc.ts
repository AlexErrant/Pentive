import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

export interface Context extends Record<string, unknown> {
	user: string | undefined
}

// We export only the functionality that we use so we can enforce which base procedures should be used
// Do not export `t`!
const t = initTRPC.context<Context>().create({
	transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

const isAuthed = t.middleware(async ({ next, ctx }) => {
	if (ctx.user === undefined) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
		})
	}
	return await next({
		ctx: {
			user: ctx.user,
		},
	})
})

export const authedProcedure = t.procedure.use(isAuthed)
