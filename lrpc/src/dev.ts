// this exists because I couldn't figure out how to `watch` serverless/lambdaHandler.ts

import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import http, { IncomingMessage, ServerResponse } from "http"
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

const handler = createHTTPHandler({
  router: appRouter<Context>(),
  createContext,
})

const server = http.createServer(async (req, res) => {
  // Set CORS headers - https://github.com/trpc/trpc/discussions/655
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Request-Method", "*")
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET")
  res.setHeader("Access-Control-Allow-Headers", "*")
  if (req.method === "OPTIONS") {
    res.writeHead(200)
    res.end()
    return
  }
  await handler(req, res)
})

server.listen(4050)
