import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "mediarouter/src/router"
import { csrfHeaderName } from "shared"
import superjson from "superjson"

export const apiClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://api.local.pentive.com:8787/trpc",
      headers: {
        [csrfHeaderName]: "",
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
