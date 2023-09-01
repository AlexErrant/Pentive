import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type Env } from './util'
import { type Result, type UserId } from 'shared'

export interface Context {
	user: UserId | undefined
	env: Env
}

export function createContext(
	userId: Result<UserId, Response>,
	env: Env,
): Context {
	const user = userId.tag === 'Ok' ? userId.ok : undefined
	return { user, env }
}

// We export only the functionality that we use so we can enforce which base procedures should be used
// Do not export `t`!
const t = initTRPC.context<Context>().create({
	transformer: superjson,
})

export const router = t.router

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
export const publicProcedure = t.procedure
