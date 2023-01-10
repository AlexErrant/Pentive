import { setKysely } from "shared"
import {
  createHandler,
  renderAsync,
  StartServer,
} from "solid-start/entry-server"
import { setSessionStorage } from "./db/session"

export default createHandler(
  renderAsync((event) => {
    setKysely(event.env.planetscaleDbUrl)
    setSessionStorage(event.env.hubSessionSecret)
    return <StartServer event={event} />
  })
)
