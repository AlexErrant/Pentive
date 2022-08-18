import type { JSX } from "solid-js"
import { useRoutes } from "solid-app-router"

import { routes } from "./routes"
import { Plugin } from "./components/plugin-wrapper"
import Nav from "./web-components/nav"

export default function App(): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const Route = useRoutes(routes)

  return (
    <>
      <Plugin name="nav">
        <Nav />
      </Plugin>

      <main>
        <Route />
      </main>
    </>
  )
}
