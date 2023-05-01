import { type JSX, Show } from "solid-js"
import { A } from "solid-start"
import { createServerAction$, createServerData$ } from "solid-start/server"
import { getUserId, logout } from "~/session"

function Nav(): JSX.Element {
  const userId = createServerData$(
    async (_, { request }) => await getUserId(request)
  )
  const [, { Form }] = createServerAction$(
    async (f: FormData, { request }) => await logout(request)
  )
  return (
    <header class="header">
      <nav class="inner">
        <A href="/">
          <strong>Pentive</strong>
        </A>
        <A href={import.meta.env.VITE_APP_ORIGIN}>
          <strong>App</strong>
        </A>
        <span class="profile">
          <Show when={userId() != null} fallback={<A href="/login">Login</A>}>
            <A href={`/u/${userId()!}`}>{userId()!}</A>
            <Form>
              {/* medTODO csrf */}
              <button name="logout" type="submit">
                Logout
              </button>
            </Form>
          </Show>
        </span>
      </nav>
    </header>
  )
}

export default Nav
