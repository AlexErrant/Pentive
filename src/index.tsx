import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { customElement } from "solid-element"
import Nav from "./web-components/nav"

customElement("pentive-nav", Nav)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)
