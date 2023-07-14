import { createStore } from "solid-js/store"
import { type JSX, Show, onMount } from "solid-js"
import TemplatesTable from "../components/templatesTable"
import type TemplatesData from "./templates.data"
import { useRouteData } from "@solidjs/router"
import { type Template } from "shared"
import ResizingIframe from "../components/resizingIframe"
import { GoldenLayout, LayoutConfig } from "golden-layout"
import { render } from "solid-js/web"

import "golden-layout/dist/css/goldenlayout-base.css"
import "golden-layout/dist/css/themes/goldenlayout-light-theme.css"
import EditTemplate from "../components/editTemplate"

export default function Templates(): JSX.Element {
  const templates = useRouteData<typeof TemplatesData>()
  const [selected, setSelected] = createStore<{ template?: Template }>({})
  let glRoot: HTMLDivElement
  onMount(() => {
    const goldenLayout = new GoldenLayout(glRoot)
    goldenLayout.resizeWithContainerAutomatically = true
    goldenLayout.registerComponentFactoryFunction(
      "TemplatesTable",
      (container) => {
        render(
          () => (
            <TemplatesTable
              templates={templates()}
              onSelectionChanged={(ncs) => {
                setSelected("template", ncs.at(0))
              }}
            />
          ),
          container.element
        )
      }
    )
    goldenLayout.registerComponentFactoryFunction(
      "TemplateDetail",
      (container) => {
        render(
          () => (
            <Show when={selected.template != null}>
              {selected.template!.fields.map((f) => f.name).join(", ")}
            </Show>
          ),
          container.element
        )
      }
    )
    goldenLayout.registerComponentFactoryFunction(
      "Add Template",
      (container) => {
        render(() => <EditTemplate />, container.element)
      }
    )
    goldenLayout.registerComponentFactoryFunction(
      "Layout Manager",
      (container) => {
        render(
          () => (
            <div>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("TemplatesTable")
                }}
              >
                Add TemplatesTable
              </button>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("TemplateDetail")
                }}
              >
                Add TemplateDetail
              </button>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("Preview Template")
                }}
              >
                Add Preview Template
              </button>
            </div>
          ),
          container.element
        )
      }
    )
    goldenLayout.registerComponentFactoryFunction(
      "Preview Template",
      (container) => {
        render(
          () => (
            // lowTODO: iterate over all templates... or not. If there are 10 it'll look ugly
            <Show when={selected.template != null}>
              <ResizingIframe
                i={{
                  tag: "template",
                  side: "front",
                  template: selected.template!,
                  index: 0,
                }}
              />
            </Show>
          ),
          container.element
        )
      }
    )
    goldenLayout.on("stateChanged", () => {
      const config = LayoutConfig.fromResolved(goldenLayout.saveLayout())
      localStorage.setItem("templatePageLayoutConfig", JSON.stringify(config))
    })
    const layoutConfig = localStorage.getItem("templatePageLayoutConfig")
    if (layoutConfig != null) {
      goldenLayout.loadLayout(JSON.parse(layoutConfig) as LayoutConfig)
    } else {
      goldenLayout.loadLayout({
        header: {
          popout: false,
          maximise: false, // disabling for now because using it causes the other panels to be at the bottom of the screen for some reason https://github.com/golden-layout/golden-layout/issues/847
        },
        root: {
          type: "row",
          content: [
            {
              type: "stack",
              content: [
                {
                  type: "component",
                  componentType: "TemplatesTable",
                },
                {
                  type: "component",
                  componentType: "Add Template",
                },
                {
                  type: "component",
                  componentType: "Layout Manager",
                  isClosable: false,
                },
              ],
            },
            {
              type: "stack",
              content: [
                {
                  type: "component",
                  componentType: "TemplateDetail",
                },
                {
                  type: "component",
                  componentType: "Preview Template",
                },
              ],
            },
          ],
        },
      })
    }
  })
  return <div ref={(e) => (glRoot = e)} class="h-full" />
}
