import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "cwa/src/router"
import { csrfHeaderName } from "shared"
import superjson from "superjson"

export const apiClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://api.pentive.local:8787/trpc",
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
