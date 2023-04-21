// this exists because I couldn't figure out how to `watch` serverless/lambdaHandler.ts

import { createHTTPHandler } from "@trpc/server/adapters/standalone"
import { type IncomingMessage, type ServerResponse } from "http"
import { type NodeHTTPCreateContextFnOptions } from "@trpc/server/adapters/node-http"
import { appRouter } from "./appRouter.js"
import { getUser } from "./core.js"
import { type Context } from "./trpc.js"
import fs from "fs"
import https from "https"
import { csrfHeaderName, hstsName, hstsValue } from "shared"

// run with `npm run dev`

async function createContext(
  x: NodeHTTPCreateContextFnOptions<
    IncomingMessage,
    ServerResponse<IncomingMessage>
  >
): Promise<Context> {
  const user = await getUser(x.req.headers)
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
    // medTODO add caching https://httptoolkit.com/blog/cache-your-cors/ https://techpearl.com/blog/avoid-options-call-to-improve-the-performance-of-your-web-apps/
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://app.pentive.localhost:3013"
    )
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Request-Method", "*")
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET")
    res.setHeader(
      "Access-Control-Allow-Headers",
      `${csrfHeaderName},content-type`
    )
    res.setHeader("Access-Control-Max-Age", 86400) // 24hrs - browsers don't support longer https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age

    // highTODO check with https://securityheaders.com/
    res.setHeader(hstsName, hstsValue)

    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }
    await handler(req, res)
  }
)

server.listen(4050, "0.0.0.0", () => {
  console.log("listening to 4050")
})
