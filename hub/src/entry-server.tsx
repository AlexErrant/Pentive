import { setKysely, hstsName, hstsValue } from "shared"
import {
  createHandler,
  renderAsync,
  StartServer,
} from "solid-start/entry-server"
import { setSessionStorage } from "./db/session"

export default createHandler(
  renderAsync((event) => {
    setKysely(event.env.planetscaleDbUrl)
    setSessionStorage({
      sessionSecret: event.env.hubSessionSecret,
      jwsSecret: event.env.jwsSecret,
      csrfSecret: event.env.csrfSecret,
      hubInfoSecret: event.env.hubInfoSecret,
    })
    event.responseHeaders.set(hstsName, hstsValue)
    return <StartServer event={event} />
  })
)
