import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"

import "./web-components/registry" // register web components

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)
