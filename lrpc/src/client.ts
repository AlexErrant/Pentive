import { createTRPCClient } from "@trpc/client"
import fetch from "node-fetch"
import type { AppRouter } from "./server"

// @ts-expect-error lowTodo fix whenever we move off node-fetch
global.fetch = fetch

const client = createTRPCClient<AppRouter>({ url: "http://127.0.0.1:4050" })

void (async () => {
  try {
    const q = await client.query("greet", { name: "Erik" })
    console.log(q)
    await client.mutation("addTemplate", {
      name: "my first template",
      id: "13",
    })
    const template = await client.query("getTemplate", "13")
    console.log(template)
  } catch (error) {
    console.log("error", error)
  }
})()
