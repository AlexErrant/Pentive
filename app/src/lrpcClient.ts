import { createTRPCClient } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"
import superjson from "superjson"

export const lrpc = createTRPCClient<AppRouter>({
  url: "http://localhost:4050",
  transformer: superjson,
})
