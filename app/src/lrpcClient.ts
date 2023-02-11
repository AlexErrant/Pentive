import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"
import superjson from "superjson"

export const lrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://lrpc.local.pentive.com:4050",
      headers: {
        csrfHeaderName: "",
      },
      async fetch(url, options) {
        return await fetch(url, {
          body: options?.body, // nextTODO revert upon resolution of https://github.com/trpc/trpc/issues/3734
          headers: options?.headers,
          method: options?.method,
          credentials: "include",
        })
      },
    }),
  ],
  transformer: superjson,
})
