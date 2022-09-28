// this exists because I couldn't figure out how to `watch` serverless/lambdaHandler.ts

import { createHTTPServer } from "@trpc/server/adapters/standalone"
import { IncomingMessage, ServerResponse } from "http"
import { NodeHTTPCreateContextFnOptions } from "@trpc/server/dist/declarations/src/adapters/node-http/types"
import * as trpc from "@trpc/server"
import { appRouter } from "./appRouter"

function createContext(
  x: NodeHTTPCreateContextFnOptions<
    IncomingMessage,
    ServerResponse<IncomingMessage>
  >
): {
  user: string | undefined
} {
  return { user: undefined }
}
type Context = trpc.inferAsyncReturnType<typeof createContext>

const server = createHTTPServer({
  router: appRouter<Context>(),
  createContext,
})

server.listen(4050)
