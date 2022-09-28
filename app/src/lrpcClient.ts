import { createTRPCClient } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"

export const lrpc = createTRPCClient<AppRouter>({
  url: "http://localhost:4050",
})
