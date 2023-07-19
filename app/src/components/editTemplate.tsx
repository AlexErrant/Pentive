import { type VoidComponent, For, Show } from "solid-js"
import {
  getDefaultTemplate,
  type ChildTemplate,
  type Template,
  getDefaultClozeTemplate,
} from "shared"
import { type SetStoreFunction, createStore } from "solid-js/store"
import { Select } from "@thisbeyond/solid-select"
import { type ClozeTemplate, type StandardTemplate } from "shared-dom"
import EditChildTemplate from "./editChildTemplate"

import "@thisbeyond/solid-select/style.css"

interface ClozeTemplateStore {
  template: ClozeTemplate
}
interface StandardTemplateStore {
  template: StandardTemplate
}

const EditTemplate: VoidComponent = () => {
  const [template, setTemplate] = createStore<{ template: Template }>({
    template: getDefaultTemplate(), // setTemplate mutates this so we gotta get a new object reference
  })
  return (
    <>
      <Select
        initialValue={"standard"}
        options={["standard", "cloze"]}
        onChange={(value: string) => {
          setTemplate(
            "template",
            value === "standard"
              ? getDefaultTemplate()
              : getDefaultClozeTemplate()
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
            template={template.template}
            childTemplate={
              (template.template as ClozeTemplate).templateType.template
            }
            i={0}
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
          each={(template.template as StandardTemplate).templateType.templates}
        >
          {(childTemplate, i) => {
            return (
              <EditChildTemplate
                template={template.template}
                childTemplate={childTemplate}
                i={i()}
                setTemplate={<K extends keyof ChildTemplate>(
                  key: K,
                  val: ChildTemplate[K]
                ) => {
                  ;(setTemplate as SetStoreFunction<StandardTemplateStore>)(
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
  )
}

export default EditTemplate
