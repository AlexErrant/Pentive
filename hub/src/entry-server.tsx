import { hstsName, hstsValue } from "shared"
import { setKysely } from "shared-edge"
import {
  createHandler,
  renderAsync,
  StartServer,
} from "solid-start/entry-server"
import { setSessionStorage } from "./session"

export default createHandler(
  renderAsync((event) => {
    /* eslint-disable solid/reactivity -- event.env and event.responseHeaders should never change at runtime */
    setKysely(event.env.planetscaleDbUrl)
    setSessionStorage({
      sessionSecret: event.env.hubSessionSecret,
      jwsSecret: event.env.jwsSecret,
      csrfSecret: event.env.csrfSecret,
      hubInfoSecret: event.env.hubInfoSecret,
      oauthStateSecret: event.env.oauthStateSecret,
      oauthCodeVerifierSecret: event.env.oauthCodeVerifierSecret,
    })
    event.responseHeaders.set(hstsName, hstsValue)
    /* eslint-enable solid/reactivity */
    return <StartServer event={event} />
  })
)
