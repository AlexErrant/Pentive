import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { AppRouter } from "lrpc/src/appRouter"
import { JWT_BEARER_TOKEN } from "rxql/shared"
import superjson from "superjson"

export const lrpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:4050",
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: "Bearer " + JWT_BEARER_TOKEN,
      },
    }),
  ],
  transformer: superjson,
})
