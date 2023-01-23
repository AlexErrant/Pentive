import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"
import superjson from "superjson"

export const lrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://lrpc.local.pentive.com:4050",
      async fetch(url, options) {
        return await fetch(url, {
          ...options,
          credentials: "include",
        })
      },
    }),
  ],
  transformer: superjson,
})
