import type { JSX } from "solid-js"
import { useRoutes } from "@solidjs/router"

import { navLinks, routes } from "./routes.js"
import { Plugin } from "./components/plugin-wrapper.js"
import Nav from "./custom-elements/nav.js"

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
