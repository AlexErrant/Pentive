import { type JSX } from "solid-js"
import TemplatesTable from "../components/templatesTable"
import type TemplatesData from "./templates.data"
import { useRouteData } from "@solidjs/router"

export default function Templates(): JSX.Element {
  const templates = useRouteData<typeof TemplatesData>()
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Templates</h1>
      </section>
      <TemplatesTable templates={templates()} />
    </>
  )
}
