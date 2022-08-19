import { JSX, createEffect, Suspense } from "solid-js"
import { useRouteData } from "solid-app-router"
import TemplatesData from "./templates.data"

export default function Templates(): JSX.Element {
  const name = useRouteData<typeof TemplatesData>()

  createEffect(() => {
    console.log(name())
  })

  return (
    <section class="bg-pink-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Templates</h1>

      <p class="mt-4">A page all about this website.</p>

      <p>
        <span>We love</span>
        <Suspense fallback={<span>...</span>}>
          <span>&nbsp;{name()}</span>
        </Suspense>
      </p>
    </section>
  )
}
