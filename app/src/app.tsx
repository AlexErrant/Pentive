import type { JSX } from "solid-js"
import { useRoutes } from "solid-app-router"

import { navLinks, routes } from "./routes"
import { Plugin } from "./components/plugin-wrapper"
import Nav from "./customElements/nav"

export default function App(): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/naming-convention
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
