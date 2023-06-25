import { expect, test } from "vitest"
import {
  type TemplateId,
  type Ord,
  type PluginName,
  type PluginVersion,
  type Template,
} from "shared"
import { type Plugin } from "./plugin.js"
import { registerPluginServices } from "./pluginManager.js"
import { strip } from "./cardHtml"

function expectStrippedToBe(html: string, expected: string): void {
  const newline = /[\r\n]/g
  expect(strip(html).replace(newline, "").trim()).toBe(expected)
}

const clozeWithRequiredEdit: Template = {
  id: "" as TemplateId,
  name: "",
  created: new Date(),
  updated: new Date(),
  remotes: new Map(),
  css: "",
  fields: [{ name: "Text" }, { name: "Extra" }],
  templateType: {
    tag: "cloze" as const,
    template: {
      id: 0 as Ord,
      name: "Cloze",
      front: "{{edit:cloze:Text}}",
      back: "{{edit:cloze:Text}}{{Extra}}",
    },
  },
}

function buildPlugin(src: string): Plugin {
  return {
    script: new Blob([src], {
      type: "text/javascript",
    }),
    name: "somePluginName" as string as PluginName,
    version: "0.0.0" as PluginVersion,
    created: new Date(),
    updated: new Date(),
  }
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
  const plugin = buildPlugin(`
"use strict";
function clozeTemplateRegex(c) {
    return new RegExp(c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"), c.clozeTemplateRegex.flags);
}
var exports = {
    services: function (c) {
        return {
            clozeTemplateRegex: clozeTemplateRegex(c)
        };
    }
};
export default exports;`)
  const c = await registerPluginServices([plugin])
  const templates = c.renderTemplate(clozeWithRequiredEdit)
  expect(templates.length).toBe(1)
  const [template] = templates
  expectTemplate(
    template,
    "This is a cloze deletion for [ ... ] .",
    "This is a cloze deletion for [ Text ] .(Extra)"
  )
})

test("renderTemplate works with plugin that requires `.bind(this)` because it indirectly calls its custom `edit` syntax", async () => {
  const plugin = buildPlugin(`
"use strict";
function clozeTemplateRegex(c) {
  return new RegExp(c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"), c.clozeTemplateRegex.flags);
}
function renderTemplate(c) {
  return function (template) {
      var original = c.renderTemplate.bind(this)(template);
      return original.map(function (x) {
          return x !== null ? [x[0].toUpperCase(), x[1].toUpperCase()] : null;
      });
  };
}
var services = function (c) {
  return {
      clozeTemplateRegex: clozeTemplateRegex(c),
      renderTemplate: renderTemplate(c)
  };
};
var exports = {
  services: services
};
export default exports;`)
  const c = await registerPluginServices([plugin])
  const templates = c.renderTemplate(clozeWithRequiredEdit)
  expect(templates.length).toBe(1)
  const [template] = templates
  expectTemplate(
    template,
    "THIS IS A CLOZE DELETION FOR [ ... ] .",
    "THIS IS A CLOZE DELETION FOR [ TEXT ] .(EXTRA)"
  )
})

test("ensure that the above test fails if the indirect call disappears, rendering `bind(this)` moot", async () => {
  const plugin = buildPlugin(`
"use strict";
function clozeTemplateRegex(c) {
  return new RegExp(c.clozeTemplateRegex.source.replace("cloze:", "edit:cloze:"), c.clozeTemplateRegex.flags);
}
function renderTemplate(c) {
  return function (template) {
      var original = c.renderTemplate(template);
      return original.map(function (x) {
          return x !== null ? [x[0].toUpperCase(), x[1].toUpperCase()] : null;
      });
  };
}
var services = function (c) {
  return {
      clozeTemplateRegex: clozeTemplateRegex(c),
      renderTemplate: renderTemplate(c)
  };
};
var exports = {
  services: services
};
export default exports;`)
  const c = await registerPluginServices([plugin])
  const templates = c.renderTemplate(clozeWithRequiredEdit)
  expect(templates.length).toBe(0)
})
