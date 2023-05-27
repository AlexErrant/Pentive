import type { JSX } from "solid-js"
import { useRoutes } from "@solidjs/router"

import { navLinks, routes } from "./routes"
import { C } from "."

export default function App(): JSX.Element {
  const Route = useRoutes(routes)

  return (
    <>
      <C.nav navLinks={navLinks} />

      <main>
        <Route />
      </main>
    </>
  )
}
