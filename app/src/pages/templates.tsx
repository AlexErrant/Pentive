import { createStore } from "solid-js/store"
import { type JSX, Show } from "solid-js"
import TemplatesTable from "../components/templatesTable"
import type TemplatesData from "./templates.data"
import { useRouteData } from "@solidjs/router"
import { type Template } from "shared"
import ResizingIframe from "../components/resizingIframe"

export default function Templates(): JSX.Element {
  const templates = useRouteData<typeof TemplatesData>()
  const [selected, setSelected] = createStore<{ template?: Template }>({})
  return (
    <>
      <TemplatesTable
        templates={templates()}
        onSelectionChanged={(ncs) => {
          setSelected("template", ncs.at(0))
        }}
      />
      {/* lowTODO: iterate over all templates... or not. If there are 10 it'll look ugly */}
      <Show when={selected.template != null}>
        <ResizingIframe
          i={{
            tag: "template",
            side: "front",
            templateId: selected.template!.id,
            index: "0",
          }}
        />
      </Show>
    </>
  )
}
