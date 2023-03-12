import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { db } from "./db"
import * as Comlink from "comlink"

import { registerPluginServices } from "./pluginManager"

const plugins = await db.getPlugins()

export const [C, registeredElements] = await registerPluginServices(plugins)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)

export const appExpose = {
  hiFromApp: (msg: string) => {
    console.log("Hi from app! You said:", msg)
  },
}

// highTODO needs security
Comlink.expose(appExpose, Comlink.windowEndpoint(self.parent))
