// this exists because I couldn't figure out how to `watch` serverless/lambdaHandler.ts

import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import { IncomingMessage, ServerResponse } from "http"
import { NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http"
import { appRouter } from "./appRouter.js"
import { getUser } from "./core.js"
import { Context } from "./trpc.js"
import fs from "fs"
import https from "https"

// run with `npm run dev`

async function createContext(
  x: NodeHTTPCreateContextFnOptions<
    IncomingMessage,
    ServerResponse<IncomingMessage>
  >
): Promise<Context> {
  const user = await getUser(x.req.headers.cookie)
  return { user }
}

const handler = createHTTPHandler({
  router: appRouter,
  createContext,
})

const server = https.createServer(
  {
    key: fs.readFileSync("./.cert/key.pem"),
    cert: fs.readFileSync("./.cert/cert.pem"),
  },
  async (req, res) => {
    // Set CORS headers - https://github.com/trpc/trpc/discussions/655
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://secure.local.pentive.com:3014"
    )
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "*")
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }
    await handler(req, res)
  }
)

server.listen(4050, "0.0.0.0", () => console.log("listening to 4050"))
