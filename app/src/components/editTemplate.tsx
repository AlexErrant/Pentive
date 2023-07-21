import { type VoidComponent, For, Show, createEffect } from "solid-js"
import {
  getDefaultTemplate,
  type ChildTemplate,
  type Template,
  getDefaultClozeTemplate,
  type TemplateId,
} from "shared"
import { type SetStoreFunction, createStore } from "solid-js/store"
import { Select } from "@thisbeyond/solid-select"
import { type ClozeTemplate, type StandardTemplate } from "shared-dom"
import EditChildTemplate from "./editChildTemplate"
import { ulidAsBase64Url } from "../domain/utility"
import { db } from "../db"

import "@thisbeyond/solid-select/style.css"

interface ClozeTemplateStore {
  template: ClozeTemplate
}
interface StandardTemplateStore {
  template: StandardTemplate
}

const EditTemplate: VoidComponent<{ template: Template }> = (props) => {
  const [template, setTemplate] = createStore<{ template: Template }>({
    template: getDefaultTemplate(ulidAsBase64Url() as TemplateId),
  })
  createEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- touch template.id so we setTemplate if template changes
    props.template.id
    setTemplate("template", props.template)
  })
  return (
    <>
      <Select
        initialValue={props.template.templateType.tag}
        options={["standard", "cloze"]}
        onChange={(value: string) => {
          if (template.template.templateType.tag !== value) {
            setTemplate(
              "template",
              value === "standard"
                ? getDefaultTemplate(template.template.id)
                : getDefaultClozeTemplate(template.template.id)
            )
          }
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
      <button
        onClick={async () => {
          await db.bulkUpsertTemplate([template.template])
        }}
      >
        Save
      </button>
    </>
  )
}

export default EditTemplate
