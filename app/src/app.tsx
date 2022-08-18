import type { JSX } from "solid-js"
import { useRoutes } from "solid-app-router"

import { routes } from "./routes"

export default function App(): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const Route = useRoutes(routes)

  return (
    <>
      <pentive-nav></pentive-nav>

      <main>
        <Route />
      </main>
    </>
  )
}
