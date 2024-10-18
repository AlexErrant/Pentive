import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type Env } from './util'
import { type Result } from 'shared/result'
import { type UserId } from 'shared/brand'

export interface Context {
	user: Result<UserId, string>
	env: Env
}

// We export only the functionality that we use so we can enforce which base procedures should be used
// Do not export `t`!
const t = initTRPC.context<Context>().create({
	transformer: superjson,
})

export const router = t.router

const isAuthed = t.middleware(async ({ next, ctx }) => {
	if (ctx.user.tag === 'Error') {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: ctx.user.error,
		})
	}
	return await next({
		ctx: {
			user: ctx.user.ok,
		},
	})
})

export const authedProcedure = t.procedure.use(isAuthed)
export const publicProcedure = t.procedure
