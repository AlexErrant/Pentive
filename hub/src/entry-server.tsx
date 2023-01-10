import { setKysely } from "shared"
import {
  createHandler,
  renderAsync,
  StartServer,
} from "solid-start/entry-server"

export default createHandler(
  renderAsync((event) => {
    setKysely(event.env.planetscaleDbUrl)
    return <StartServer event={event} />
  })
)
