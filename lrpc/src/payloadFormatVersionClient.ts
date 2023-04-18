/* eslint-disable */
// @ts-nocheck honestly this file should be deleted

import { createTRPCClient } from "@trpc/client"
import fetch from "node-fetch"
import type { AppRouter } from "./appRouter"

// @ts-expect-error lowTodo fix whenever we move off node-fetch
global.fetch = fetch

const httpApiClient = createTRPCClient<AppRouter>({
  url: "http://127.0.0.1:4050",
})
const restApiClient = createTRPCClient<AppRouter>({
  url: "http://127.0.0.1:4050/dev",
})

await (async () => {
  try {
    // A Very simple client to test showcase both APIGW v1(Rest API) and v2(HTTP API) support with serverless-offline
    const queryForVersion2 = await httpApiClient.query("greet", {
      name: "bob's your uncle",
    })
    console.log(queryForVersion2)
    const queryForVersion1 = await restApiClient.query("greet", {
      name: "bob's your uncle",
    })
    console.log(queryForVersion1)
  } catch (error) {
    console.log("error", error)
  }
})()
