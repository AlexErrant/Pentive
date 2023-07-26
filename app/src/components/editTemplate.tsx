import { type VoidComponent, For, Show, createEffect, type JSX } from "solid-js"
import {
  getDefaultTemplate,
  type ChildTemplate,
  type Template,
  getDefaultClozeTemplate,
  type TemplateId,
  type NookId,
  objEntries,
  type Ord,
} from "shared"
import { type SetStoreFunction, createStore } from "solid-js/store"
import { Select } from "@thisbeyond/solid-select"
import { type ClozeTemplate, type StandardTemplate } from "shared-dom"
import EditChildTemplate from "./editChildTemplate"
import { ulidAsBase64Url } from "../domain/utility"
import { db } from "../db"

import "@thisbeyond/solid-select/style.css"
import EditTemplateCss from "./editTemplateCss"

interface ClozeTemplateStore {
  template: ClozeTemplate
}
interface StandardTemplateStore {
  template: StandardTemplate
}

function removeNook(
  nook: NookId,
  setTemplate: SetStoreFunction<{
    template: Template
  }>
) {
  return (
    <button
      type="button"
      onClick={() => {
        setTemplate("template", "remotes", (x) => ({ ...x, [nook]: undefined }))
      }}
    >
      ❌
    </button>
  )
}

function remoteCell(
  template: Template,
  setTemplate: SetStoreFunction<{
    template: Template
  }>
): JSX.Element {
  return (
    <fieldset class="border border-black p-2">
      <legend>
        <span class="p-2 px-2 font-bold">Nooks</span>
      </legend>
      <ul>
        <For each={objEntries(template.remotes)}>
          {([nookId, remoteTemplate]) => (
            <li class="py-2 px-4">
              <Show when={remoteTemplate != null} fallback={nookId}>
                <a
                  href={`${import.meta.env.VITE_HUB_ORIGIN}/t/${
                    remoteTemplate!.remoteTemplateId
                  }`}
                >
                  {nookId}
                </a>
              </Show>
              {removeNook(nookId, setTemplate)}
            </li>
          )}
        </For>
      </ul>
      <input
        name="newNookId"
        class="w-75px p-1 bg-white text-sm rounded-lg border"
        type="text"
        onChange={(e) => {
          setTemplate(
            "template",
            "remotes",
            e.currentTarget.value as NookId,
            null
          )
        }}
      />
    </fieldset>
  )
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
      {childTemplates(template, setTemplate)}
      <EditTemplateCss template={template.template} setTemplate={setTemplate} />
      {remoteCell(template.template, setTemplate)}
      <button
        onClick={async () => {
          await db.upsertTemplate(template.template)
        }}
      >
        Save
      </button>
    </>
  )
}

export default EditTemplate

function childTemplates(
  template: {
    template: Template
  },
  setTemplate: SetStoreFunction<{
    template: Template
  }>
) {
  return (
    <fieldset class="border border-black p-2">
      <legend>
        <Show
          when={template.template.templateType.tag === "standard"}
          fallback={<span class="p-2 px-4 font-bold">Template</span>}
        >
          <span class="p-2 px-4 font-bold">Child Templates</span>
          <button
            class="bg-green-600 hover:bg-green-700 text-white  py-1/2 px-2 m-2 rounded"
            onClick={() => {
              ;(setTemplate as SetStoreFunction<StandardTemplateStore>)(
                "template",
                "templateType",
                "templates",
                (templates) => {
                  const lastChildTemplate = templates.at(-1)!
                  return [
                    ...templates,
                    {
                      id: (lastChildTemplate.id + 1) as Ord,
                      name: lastChildTemplate.name + " (2)",
                      front: lastChildTemplate.front,
                      back: lastChildTemplate.back,
                    },
                  ]
                }
              )
            }}
          >
            +
          </button>
        </Show>
      </legend>
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
    </fieldset>
  )
}
