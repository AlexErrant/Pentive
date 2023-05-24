import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "cwa/src/router"
import { csrfHeaderName } from "shared"
import superjson from "superjson"
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the emitted types
import type * as cwa from "cwa"

export const cwaClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_CWA_URL + "trpc",
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
