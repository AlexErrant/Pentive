import { router } from './trpc'
import { noteRouter } from './noteRouter'
import { templateRouter } from './templateRouter'

export const appRouter = router({
	...noteRouter,
	...templateRouter,
})

export type AppRouter = typeof appRouter
