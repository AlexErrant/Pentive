import { Show, type JSX } from "solid-js"
import { FormError, useRouteData } from "solid-start"
import { createNook } from "shared-edge"
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server"
import {
  requireCsrfSignature,
  requireJwt,
  isInvalidCsrf,
  requireUserId,
} from "~/session"
import { type NookId } from "shared"

export function routeData() {
  return {
    csrfSignature: createServerData$(
      async (_, { request }) => await requireCsrfSignature(request),
      { key: () => ["csrfSignature"] }
    ),
  }
}

function validateSidebar(sidebar: unknown): string | undefined {
  if (typeof sidebar !== "string" || sidebar.length < 3) {
    return `Sidebar must be at least 3 characters long.`
  }
}

function validateDescription(description: unknown): string | undefined {
  if (typeof description !== "string" || description.length < 6) {
    return `Description must be at least 6 characters long.`
  }
}

function validateNook(nook: unknown): string | undefined {
  if (typeof nook !== "string" || nook.length < 1) {
    return `Nook must be at least 1 character long.`
  }
}

export default function Submit(): JSX.Element {
  const { csrfSignature } = useRouteData<typeof routeData>()

  const [submitting, { Form }] = createServerAction$(
    async (form: FormData, { request }) => {
      const sidebar = form.get("sidebar")
      const description = form.get("description")
      const nook = form.get("nook") as NookId
      const csrfSignature = form.get("csrfSignature")
      if (
        typeof sidebar !== "string" ||
        typeof description !== "string" ||
        typeof nook !== "string" ||
        typeof csrfSignature !== "string"
      ) {
        throw new FormError(
          `Sidebar, description, nook, and csrfSignature should be strings.`
        )
      }
      const fields = { sidebar, description, nook }
      const fieldErrors = {
        sidebar: validateSidebar(sidebar),
        description: validateDescription(description),
        nook: validateNook(nook),
      }
      if (Object.values(fieldErrors).some(Boolean)) {
        throw new FormError("Some fields are invalid", { fieldErrors, fields })
      }
      const userId = await requireUserId(request)
      const jwt = await requireJwt(request)
      if (await isInvalidCsrf(csrfSignature, jwt.jti)) {
        const searchParams = new URLSearchParams([
          ["redirectTo", new URL(request.url).pathname],
        ])
        throw redirect(`/login?${searchParams.toString()}`) as unknown
      }

      await createNook({
        userId,
        sidebar,
        description,
        nook,
      })
      // highTODO return redirect to post
    }
  )
  const error = (): FormError | undefined =>
    submitting.error as undefined | FormError

  // highTODO idempotency token

  return (
    <main>
      <h1>Create Nook</h1>
      <Form>
        <input
          type="hidden"
          name="csrfSignature"
          value={csrfSignature() ?? ""}
        />
        <div>
          <label for="nook-input">Nook Name</label>
          <input id="nook-input" name="nook" />
        </div>
        <div>
          <label for="sidebar-input">Sidebar</label>
          <input id="sidebar-input" name="sidebar" />
        </div>
        <Show when={error()?.fieldErrors?.sidebar}>
          <p>{error()!.fieldErrors!.sidebar}</p>
        </Show>
        <div>
          <label for="description-input">Description</label>
          <textarea
            id="description-input"
            name="description"
            rows="4"
            cols="50"
          />
        </div>
        <Show when={error()?.fieldErrors?.description}>
          <p>{error()!.fieldErrors!.description}</p>
        </Show>
        <Show when={error()}>
          <p>{error()!.message}</p>
        </Show>
        <button type="submit">Create Nook</button>
      </Form>
    </main>
  )
}
