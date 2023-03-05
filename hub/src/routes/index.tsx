import { ChildTemplateId } from "shared"
import { JSX } from "solid-js"
import { useRouteData } from "solid-start"
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server"
import ResizingIframe from "~/components/resizingIframe"
import { getUser, logout } from "~/db/session"

export function routeData() {
  return createServerData$(async (_, { request }) => {
    const user = await getUser(request)

    if (user == null) {
      throw redirect("/login") as unknown
    }

    return user
  })
}

export default function Home(): JSX.Element {
  const user = useRouteData<typeof routeData>()
  const [, { Form }] = createServerAction$(
    async (f: FormData, { request }) => await logout(request)
  )

  return (
    <main class="w-full p-4 space-y-2">
      <h1 class="font-bold text-3xl">Hello {user()?.username}</h1>
      <h3 class="font-bold text-xl">Message board</h3>
      <Form>
        <button name="logout" type="submit">
          Logout
        </button>
      </Form>
      <ResizingIframe
        i={{
          tag: "template",
          side: "back",
          template: {
            css: "",
            fields: [
              {
                name: "Front",
              },
              {
                name: "Back",
              },
            ],
            templateType: {
              tag: "standard",
              templates: [
                {
                  id: "lt31LyaTR3qBMQAAsZdhdg" as ChildTemplateId,
                  name: "My Template",
                  front: "{{Front}}",
                  back: `{{FrontSide}}<hr id=answer>{{Back}}<img src="book.jpg" >`, // highTODO nix book.jpg
                  shortFront: "{{Front}}",
                  shortBack: "{{Back}}",
                },
              ],
            },
          },
          index: 0,
        }}
      />
    </main>
  )
}
