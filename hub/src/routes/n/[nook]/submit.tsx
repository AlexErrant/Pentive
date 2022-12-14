import { Show, JSX } from "solid-js"
import { FormError, RouteDataArgs, useRouteData } from "solid-start"
import { Kysely } from "shared"
import { Ulid } from "id128"
import { createServerAction$, redirect } from "solid-start/server"
import { Hex } from "shared/src/brand"
import { getUser } from "~/db/session"

export function routeData({ params }: RouteDataArgs) {
  const nook = (): string => params.nook
  return { nook }
}

function validateTitle(title: unknown): string | undefined {
  if (typeof title !== "string" || title.length < 3) {
    return `Title must be at least 3 characters long.`
  }
}

function validateText(text: unknown): string | undefined {
  if (typeof text !== "string" || text.length < 6) {
    return `Text must be at least 6 characters long.`
  }
}

function validateNook(nook: unknown): string | undefined {
  if (typeof nook !== "string" || nook.length < 1) {
    return `Nook must be at least 1 character long.`
  }
}

export default function Submit(): JSX.Element {
  const { nook } = useRouteData<typeof routeData>()

  const [submitting, { Form }] = createServerAction$(
    async (form: FormData, { env, request }) => {
      const title = form.get("title")
      const text = form.get("text")
      const nook = form.get("nook")
      if (
        typeof title !== "string" ||
        typeof text !== "string" ||
        typeof nook !== "string"
      ) {
        throw new FormError(`Title, text, and nook should be strings.`)
      }
      const fields = { title, text, nook }
      const fieldErrors = {
        title: validateTitle(title),
        text: validateText(text),
        nook: validateNook(nook),
      }
      if (Object.values(fieldErrors).some(Boolean)) {
        throw new FormError("Some fields are invalid", { fieldErrors, fields })
      }
      const user = await getUser(request)
      if (user == null) throw redirect("/login") as unknown

      await new Kysely(env.planetscaleDbUrl).insertPost({
        id: Ulid.generate().toRaw() as Hex,
        authorId: user.username,
        title,
        text,
        nook,
      })
      // highTODO return redirect to post
    }
  )
  const error = (): FormError | undefined =>
    submitting.error as undefined | FormError

  // highTODO add CSRF & idempotency token
  // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie

  return (
    <main>
      <h1>Submit new Post</h1>
      <Form>
        <input type="hidden" name="nook" value={nook()} />
        <div>
          <label for="title-input">Title</label>
          <input id="title-input" name="title" />
        </div>
        <Show when={error()?.fieldErrors?.title}>
          <p>{error()!.fieldErrors!.title}</p>
        </Show>
        <div>
          <label for="text-input">Text</label>
          <textarea id="text-input" name="text" rows="4" cols="50"></textarea>
        </div>
        <Show when={error()?.fieldErrors?.text}>
          <p>{error()!.fieldErrors!.text}</p>
        </Show>
        <Show when={error()}>
          <p>{error()!.message}</p>
        </Show>
        <button type="submit">Submit</button>
      </Form>
    </main>
  )
}
