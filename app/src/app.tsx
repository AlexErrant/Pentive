import type { JSX } from "solid-js"
import { useRoutes } from "@solidjs/router"

import { navLinks, routes } from "./routes"
import { Plugin } from "./components/pluginWrapper"
import Nav from "./customElements/nav"

export default function App(): JSX.Element {
  const Route = useRoutes(routes)

  return (
    <>
      <Plugin name="nav" attrs={{ navLinks }}>
        <Nav navLinks={navLinks} />
      </Plugin>

      <main>
        <Route />
      </main>
    </>
  )
}
