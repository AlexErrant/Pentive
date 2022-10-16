import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { db } from "./messenger"

import {
  registerCustomElements,
  registerPluginServices,
} from "./plugin-manager"

const plugins = await db.getPlugins()

export const registeredNames = await registerCustomElements(plugins)
export const C = await registerPluginServices(plugins)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)
