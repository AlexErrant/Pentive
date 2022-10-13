import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { db } from "./messenger"

import { registerCustomElements } from "./plugin-manager"

export const registeredNames = await db
  .getPlugins()
  .then(registerCustomElements)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)
