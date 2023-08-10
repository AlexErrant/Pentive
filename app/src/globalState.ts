import { createResource } from "solid-js"
import { cwaClient } from "./trpcClient"

// lowTODO have hub send app a message when a successful login occurs
export const [getUserId] = createResource(
  async () => await cwaClient.getUser.query()
)
