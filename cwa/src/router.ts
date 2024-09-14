import { router } from './trpc'
import { noteRouter } from './noteRouter'
import { templateRouter } from './templateRouter'
import { userRouter } from './userRouter'

export const appRouter = router({
	...noteRouter,
	...templateRouter,
	...userRouter,
})

export type AppRouter = typeof appRouter
