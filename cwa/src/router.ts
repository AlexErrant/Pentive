import { router } from "./trpc"
import { noteRouter } from "./noteRouter"
import { templateRouter } from "./templateRouter"
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the emitted types
import type * as edge from "shared-edge"

export const appRouter = router({
  ...noteRouter,
  ...templateRouter,
})

export type AppRouter = typeof appRouter
