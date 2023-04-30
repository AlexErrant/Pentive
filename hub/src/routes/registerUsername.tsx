import { type JSX, Show } from "solid-js"
import { useParams, useRouteData } from "solid-start"
import { FormError } from "solid-start/data"
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server"
import { createUserSession, getInfo, getUserId } from "~/session"
import { getCasedUserId, registerUser } from "shared"

// https://stackoverflow.com/a/25352300
function isAlphaNumeric(str: string) {
  let code, i, len
  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i)
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123) // lower alpha (a-z)
    ) {
      return false
    }
  }
  return true
}

async function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Username must be at least 3 characters long.`
  }
  if (!isAlphaNumeric(username)) {
    return "Username must contain only letters or numbers."
  }
  const casedUserId = await getCasedUserId(username)
  if (casedUserId != null) {
    return `Username '${casedUserId.id}' already taken.`
  }
}

export function routeData() {
  return createServerData$(async (_, { request }) => {
    if ((await getUserId(request)) != null) {
      throw redirect("/") as unknown
    }
    return {}
  })
}

export default function RegisterUsername(): JSX.Element {
  useRouteData<typeof routeData>()
  const params = useParams()

  const [registering, { Form }] = createServerAction$(
    async (form: FormData, { request }) => {
      const username = form.get("username")
      const redirectTo = form.get("redirectTo") ?? "/"
      if (typeof username !== "string" || typeof redirectTo !== "string") {
        throw new FormError(`Form not submitted correctly.`)
      }
      const fields = { username }
      const fieldErrors = {
        username: await validateUsername(username),
      }
      if (Object.values(fieldErrors).some(Boolean)) {
        throw new FormError("Fields invalid", { fieldErrors, fields })
      }
      const email = await getInfo(request)
      if (email == null) return redirect("/error") // medTODO needs a page
      await registerUser(username, email)
      return await createUserSession(username, redirectTo)
    }
  )

  const error = () => registering.error as undefined | FormError

  return (
    <main>
      <h1>Register Username</h1>
      <Form>
        <input
          type="hidden"
          name="redirectTo"
          value={params.redirectTo ?? "/"}
        />
        <div>
          <label for="username-input">Username</label>
          <input id="username-input" name="username" />
        </div>
        <Show when={error()?.fieldErrors?.username}>
          <p role="alert">{error()!.fieldErrors!.username}</p>
        </Show>
        <Show when={error()}>
          <p role="alert" id="error-message">
            {error()!.message}
          </p>
        </Show>
        <button type="submit">Register</button>
      </Form>
      <h2>
        Until further notice, the database will be deleted often and without
        warning.
      </h2>
      <div>
        Usernames are case insensitive, yet case preserving. For example, if you
        choose the username <code>AlexErrant</code>, it will be displayed as{" "}
        <code>AlexErrant</code>, but links like{" "}
        <a href="https://pentive.com/u/alexerrant">
          https://pentive.com/u/alexerrant
        </a>{" "}
        will work. Usernames are not modifiable after creation, so make sure the
        casing is correct!
      </div>
      <div>
        If you've changed your email and already have a Pentive account, contact
        support.
      </div>
    </main>
  )
}
