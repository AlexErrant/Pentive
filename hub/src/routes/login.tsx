import { type JSX, Suspense } from "solid-js"
import { useRouteData } from "solid-start"

import { createServerData$, redirect } from "solid-start/server"
import { getUserId } from "~/db/session"
import { githubLoginUrl } from "./api/auth/[...solidAuth]"

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
        <a href={githubLoginUrl}>Sign in via Github</a>
      </Suspense>
    </main>
  )
}
