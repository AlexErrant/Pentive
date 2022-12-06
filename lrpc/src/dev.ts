// this exists because I couldn't figure out how to `watch` serverless/lambdaHandler.ts

import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import http, { IncomingMessage, ServerResponse } from "http"
import { NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http"
import { appRouter } from "./appRouter.js"
import { getUser } from "./core.js"
import { Context } from "./trpc.js"

// run with `npm run dev`

function createContext(
  x: NodeHTTPCreateContextFnOptions<
    IncomingMessage,
    ServerResponse<IncomingMessage>
  >
): Context {
  const user = getUser(x.req.headers.authorization)
  return { user }
}

const handler = createHTTPHandler({
  router: appRouter,
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
