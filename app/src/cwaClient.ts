import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "cwa/src/router"
import { csrfHeaderName } from "shared"
import superjson from "superjson"

export const cwaClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://cwa.pentive.local:8787/trpc",
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
