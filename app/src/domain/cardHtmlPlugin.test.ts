import "../services" // side effect to initialize C
import { expect, test } from "vitest"
import { renderTemplate } from "./cardHtml"
import { ChildTemplateId } from "./ids"
import { strip } from "./utility"
import { Plugin } from "./plugin"
import { registerPluginService } from "../plugin-manager"

function expectStrippedToBe(html: string, expected: string): void {
  const newline = /[\r\n]/g
  expect(strip(html).replace(newline, "").trim()).toBe(expected)
}

function expectTemplate(
  template: readonly [string, string] | null,
  expectedFront: string,
  expectedBack: string
): void {
  expect(template).not.toBeNull()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [front, back] = template!
  expectStrippedToBe(front, expectedFront)
  expectStrippedToBe(back, expectedBack)
}

test("renderTemplate works with plugin that requires `edit` syntax", async () => {
  const plugin: Plugin = {
    script: new Blob(
      [
        `export default {
          services: {
            clozeTemplateRegex: /{{edit:cloze:(?<fieldName>.+?)}}/gi,
          },
        }`,
      ],
      {
        type: "text/javascript",
      }
    ),
    type: {
      tag: "function",
      name: "",
    },
    id: "",
    name: "",
    created: "",
    modified: "",
  }
  await registerPluginService(plugin)
  const cloze = {
    css: "",
    fields: [
      {
        name: "Text",
      },
      {
        name: "Extra",
      },
    ],
    templateType: {
      tag: "cloze" as const,
      template: {
        id: "0" as ChildTemplateId,
        name: "Cloze",
        front: "{{edit:cloze:Text}}",
        back: "{{edit:cloze:Text}}{{Extra}}",
      },
    },
  }
  const templates = renderTemplate(cloze)
  expect(templates.length).toBe(1)
  const [template] = templates
  expectTemplate(
    template,
    "This is a cloze deletion for [...].",
    "This is a cloze deletion for [Text].(Extra)"
  )
})
