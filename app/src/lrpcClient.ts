import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"
import { csrfHeaderName } from "shared"
import superjson from "superjson"

export const lrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://lrpc.local.pentive.com:4050",
      headers: {
        [csrfHeaderName]: "",
      },
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
