import { router } from "./trpc"
import { noteRouter } from "./noteRouter"
import { templateRouter } from "./templateRouter"
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the emitted types
import type * as edge from "shared-edge"
import { userRouter } from "./userRouter"

export const appRouter = router({
  ...noteRouter,
  ...templateRouter,
  ...userRouter,
})

export type AppRouter = typeof appRouter
