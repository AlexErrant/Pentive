import { JSX, Show, Suspense, type VoidComponent } from "solid-js"
import { useParams, useRouteData } from "solid-start"
import { FormError } from "solid-start/data"
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server"
import { db } from "~/db"
import { createUserSession, getUser, login, register } from "~/db/session"
import { getSession } from "@auth/solid-start"
import { signOut, signIn } from "@auth/solid-start/client"
import { authOpts } from "./api/auth/[...solidAuth]"

function validateUsername(username: unknown): string | undefined {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`
  }
}

function validatePassword(password: unknown): string | undefined {
  if (typeof password !== "string" || password.length < 2) {
    return `Passwords must be at least 2 characters long`
  }
}

export function routeData() {
  return createServerData$(async (_, { request }) => {
    if ((await getUser(request)) != null) {
      throw redirect("/") as unknown
    }
    return {}
  })
}

export default function Login(): JSX.Element {
  const data = useRouteData<typeof routeData>()
  const params = useParams()

  const [loggingIn, { Form }] = createServerAction$(async (form: FormData) => {
    const loginType = form.get("loginType")
    const username = form.get("username")
    const password = form.get("password")
    const redirectTo = form.get("redirectTo") ?? "/"
    if (
      typeof loginType !== "string" ||
      typeof username !== "string" ||
      typeof password !== "string" ||
      typeof redirectTo !== "string"
    ) {
      throw new FormError(`Form not submitted correctly.`)
    }

    const fields = { loginType, username, password }
    const fieldErrors = {
      username: validateUsername(username),
      password: validatePassword(password),
    }
    if (Object.values(fieldErrors).some(Boolean)) {
      throw new FormError("Fields invalid", { fieldErrors, fields })
    }

    switch (loginType) {
      case "login": {
        const user = await login({ username, password })
        if (user == null) {
          throw new FormError(`Username/Password combination is incorrect`, {
            fields,
          })
        }
        return await createUserSession(`${user.username}`, redirectTo)
      }
      case "register": {
        const userExists = await db.user.findUnique({ where: { username } })
        if (userExists != null) {
          throw new FormError(`User with username ${username} already exists`, {
            fields,
          })
        }
        const user = await register({ username, password })
        return await createUserSession(`${user.username}`, redirectTo)
      }
      default: {
        throw new FormError(`Login type invalid`, { fields })
      }
    }
  })
  const error = loggingIn.error as undefined | FormError

  return (
    <main>
      <Suspense>
        <AuthShowcase />
      </Suspense>
      <h1>Login</h1>
      <Form>
        <input
          type="hidden"
          name="redirectTo"
          value={params.redirectTo ?? "/"}
        />
        <fieldset>
          <legend>Login or Register?</legend>
          <label>
            <input type="radio" name="loginType" value="login" checked={true} />{" "}
            Login
          </label>
          <label>
            <input type="radio" name="loginType" value="register" /> Register
          </label>
        </fieldset>
        <div>
          <label for="username-input">Username</label>
          <input name="username" placeholder="kody" />
        </div>
        <Show when={error?.fieldErrors?.username}>
          <p role="alert">{error!.fieldErrors!.username}</p>
        </Show>
        <div>
          <label for="password-input">Password</label>
          <input name="password" type="password" placeholder="twixrox" />
        </div>
        <Show when={error?.fieldErrors?.password}>
          <p role="alert">{error!.fieldErrors!.password}</p>
        </Show>
        <Show when={error}>
          <p role="alert" id="error-message">
            {error!.message}
          </p>
        </Show>
        <button type="submit">{data() != null ? "Login" : ""}</button>
      </Form>
    </main>
  )
}

const AuthShowcase: VoidComponent = () => {
  const sessionData = createSession()
  return (
    <div>
      <Show
        when={sessionData() == null}
        fallback={
          <>
            <p>
              <span>Logged in as {sessionData()!.user?.name}</span>
            </p>
            <button onClick={async () => await signOut()}>Sign out</button>
          </>
        }
      >
        <button onClick={async () => await signIn("github")}>
          Sign in via Github
        </button>
        <button onClick={async () => await signIn("discord")}>
          Sign in via Discord
        </button>
      </Show>
    </div>
  )
}

const createSession = () => {
  return createServerData$(async (_, event) => {
    return await getSession(event.request, authOpts(event.env))
  })
}
