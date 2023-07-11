import { type SetStoreFunction, createStore } from "solid-js/store"
import { type JSX, Show, onMount, For } from "solid-js"
import TemplatesTable from "../components/templatesTable"
import type TemplatesData from "./templates.data"
import { useRouteData } from "@solidjs/router"
import {
  defaultTemplate,
  getDefaultTemplate,
  type Template,
  defaultClozeTemplate,
  type ChildTemplate,
} from "shared"
import ResizingIframe from "../components/resizingIframe"
import { GoldenLayout, LayoutConfig } from "golden-layout"
import { render } from "solid-js/web"
import { type ClozeTemplate, type StandardTemplate } from "shared-dom"
import { Select } from "@thisbeyond/solid-select"

import "golden-layout/dist/css/goldenlayout-base.css"
import "golden-layout/dist/css/themes/goldenlayout-light-theme.css"
import "@thisbeyond/solid-select/style.css"
import EditChildTemplate from "../components/editChildTemplate"

interface ClozeTemplateStore {
  template: ClozeTemplate
}
interface StandardTemplateStore {
  template: StandardTemplate
}

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
        const [template, setTemplate] = createStore<{ template: Template }>({
          template: getDefaultTemplate(), // setTemplate mutates this so we gotta get a new object reference
        })
        render(
          () => (
            <>
              <Select
                initialValue={"standard"}
                options={["standard", "cloze"]}
                onChange={(value: string) => {
                  setTemplate(
                    "template",
                    value === "standard"
                      ? defaultTemplate
                      : defaultClozeTemplate
                  )
                }}
              />
              Name
              <input
                class="w-full border"
                type="text"
                value={template.template.name}
                onInput={(e) => {
                  setTemplate("template", "name", e.currentTarget.value)
                }}
              />
              <fieldset class="border border-black p-2">
                <legend>
                  <span class="p-2 px-4 font-bold">Fields</span>
                  <button
                    class="bg-green-600 hover:bg-green-700 text-white  py-1/2 px-2 m-2 rounded"
                    onClick={() => {
                      setTemplate("template", "fields", [
                        ...template.template.fields,
                        { name: "New Field" },
                      ])
                    }}
                  >
                    +
                  </button>
                </legend>
                <For each={template.template.fields}>
                  {(field, i) => {
                    return (
                      <input
                        class="w-full border"
                        type="text"
                        value={field.name}
                        onInput={(e) => {
                          setTemplate(
                            "template",
                            "fields",
                            i(),
                            "name",
                            e.currentTarget.value
                          )
                        }}
                      />
                    )
                  }}
                </For>
              </fieldset>
              <Show
                when={template.template.templateType.tag === "standard"}
                fallback={
                  <EditChildTemplate
                    template={
                      (template.template as ClozeTemplate).templateType.template
                    }
                    setTemplate={<K extends keyof ChildTemplate>(
                      key: K,
                      val: ChildTemplate[K]
                    ) => {
                      ;(setTemplate as SetStoreFunction<ClozeTemplateStore>)(
                        "template",
                        "templateType",
                        "template",
                        key,
                        val
                      )
                    }}
                  />
                }
              >
                <For
                  each={
                    (template.template as StandardTemplate).templateType
                      .templates
                  }
                >
                  {(template, i) => {
                    return (
                      <EditChildTemplate
                        template={template}
                        setTemplate={<K extends keyof ChildTemplate>(
                          key: K,
                          val: ChildTemplate[K]
                        ) => {
                          ;(
                            setTemplate as SetStoreFunction<StandardTemplateStore>
                          )(
                            "template",
                            "templateType",
                            "templates",
                            i(),
                            key,
                            val
                          )
                        }}
                      />
                    )
                  }}
                </For>
              </Show>
            </>
          ),
          container.element
        )
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
                  templateId: selected.template!.id,
                  index: "0",
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
