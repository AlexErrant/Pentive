import { type JSX, Suspense } from "solid-js"
import { useRouteData } from "solid-start"

import { createServerData$, redirect } from "solid-start/server"
import { getUserId } from "~/session"
import { devLoginUrl, githubLoginUrl } from "./api/auth/[...solidAuth]"

export function routeData() {
  return createServerData$(async (_, { request, env }) => {
    if ((await getUserId(request)) != null) {
      throw redirect("/") as unknown
    }
    return {}
  })
}

export default function Login(): JSX.Element {
  useRouteData<typeof routeData>()

  return (
    <main>
      <h1>Login</h1>
      <Suspense>
        <div>
          <a href={githubLoginUrl}>Sign in via Github</a>
        </div>
        {import.meta.env.DEV && (
          <>
            <h2>Dev Login</h2>
            <div>
              <a href={devLoginUrl("Griddle")}>Sign in as Griddle</a>
            </div>
            <div>
              <a href={devLoginUrl("Harry")}>Sign in as Harry</a>
            </div>
            <div>
              <a href={devLoginUrl("Campal")}>Sign in as Campal</a>
            </div>
          </>
        )}
      </Suspense>
    </main>
  )
}
