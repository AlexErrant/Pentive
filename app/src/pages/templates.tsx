import { type JSX } from "solid-js"
import TemplatesTable from "../components/templatesTable"
import type TemplatesData from "./templates.data"
import { useRouteData } from "@solidjs/router"

export default function Templates(): JSX.Element {
  const templates = useRouteData<typeof TemplatesData>()
  return (
    <>
      <TemplatesTable templates={templates()} />
    </>
  )
}
