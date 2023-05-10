import _ from "lodash"
import { type RenderContainer } from "./renderContainer.js"
import { type Ord } from "./brand.js"
import { assertNever, notEmpty, throwExp } from "./utility.js"
import { type Cloze, type Standard } from "./schema.js"
import { type Field, type Template } from "./domain/template.js"

export type StandardTemplate = Omit<Template, "templateType"> & {
  templateType: Standard
}

export type ClozeTemplate = Omit<Template, "templateType"> & {
  templateType: Cloze
}

// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.body.textContent ?? ""
}

// These have hidden state - don't use `match` or `exec`!
// https://www.tsmean.com/articles/regex/javascript-regex-match-vs-exec-vs-matchall/
export const clozeRegex =
  /{{c(?<clozeIndex>\d+)::(?<answer>.*?)(?:::(?<hint>.*?))?}}/gi
export const clozeTemplateRegex = /{{cloze:(?<fieldName>.+?)}}/gi
function clozeTemplateFor(this: RenderContainer, fieldName: string): RegExp {
  const escapedFieldName = escapeRegExp(fieldName)
  const r = this.clozeTemplateRegex.source.replace(
    "(?<fieldName>.+?)",
    escapedFieldName
  )
  return new RegExp(r, this.clozeTemplateRegex.flags)
}

// https://stackoverflow.com/a/6969486
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // $& means the whole matched string
}

// https://stackoverflow.com/a/32800728
function isNullOrWhitespace(input: string | undefined): boolean {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  return !input?.trim()
}

export function body(
  this: RenderContainer,
  fieldsAndValues: ReadonlyArray<readonly [string, string]>,
  ord: Ord,
  template: Template
): readonly [string, string] | null {
  const [fieldsAndValues2, frontTemplate2, backTemplate2] =
    getFieldsValuesFrontTemplateBackTemplate.call(
      this,
      fieldsAndValues,
      ord,
      template
    )
  const frontSide = replaceFields.call(
    this,
    fieldsAndValues2,
    true,
    frontTemplate2
  )
  if (frontSide === frontTemplate2) {
    return null
  } else {
    const backSide = replaceFields
      .call(this, fieldsAndValues2, false, backTemplate2)
      .replace(
        "{{FrontSide}}",
        replaceFields.call(this, fieldsAndValues2, false, frontTemplate2)
      )
    return [frontSide, backSide]
  }
}

function getClozeFields(
  this: RenderContainer,
  frontTemplate: string
): string[] {
  return Array.from(
    frontTemplate.matchAll(this.clozeTemplateRegex),
    (x) =>
      x.groups?.fieldName ??
      throwExp(
        "This error should never occur - is `clozeTemplateRegex` broken?"
      )
  )
}

function getFieldsValuesFrontTemplateBackTemplate(
  this: RenderContainer,
  fieldsAndValues: ReadonlyArray<readonly [string, string]>,
  ord: Ord,
  template: Template
): readonly [ReadonlyArray<readonly [string, string]>, string, string] {
  if (template.templateType.tag === "standard") {
    const { front, back } =
      template.templateType.templates.find((t) => t.id === ord) ??
      throwExp(`Ord ${ord} not found`)
    return [fieldsAndValues, front, back]
  } else {
    const i = (ord.valueOf() + 1).toString()
    const { front, back } = template.templateType.template
    const clozeFields = getClozeFields.call(this, front)
    const [fieldsAndValues2, unusedFields] = _.partition(
      fieldsAndValues,
      ([fieldName, value]) => {
        const indexMatch = Array.from(
          value.matchAll(this.clozeRegex),
          (x) =>
            x.groups?.clozeIndex ??
            throwExp("This error should never occur - is `clozeRegex` broken?")
        ).includes(i)
        return indexMatch || !clozeFields.includes(fieldName)
      }
    )
    const fieldsAndValues3 = fieldsAndValues2.map(([fieldName, value]) => {
      const value2 = Array.from(value.matchAll(this.clozeRegex))
        .filter(
          (x) =>
            (x.groups?.clozeIndex ??
              throwExp(
                "This error should never occur - is `clozeRegex` broken?"
              )) !== i
        )
        .map((x) => ({
          completeMatch: x[0],
          answer:
            x.groups?.answer ??
            throwExp("This error should never occur - is `clozeRegex` broken?"),
        }))
        .reduce(
          (state, { completeMatch, answer }) =>
            state.replace(completeMatch, answer),
          value
        )
      return [fieldName, value2] as const
    })
    const [qt, at] = unusedFields
      .map(([k]) => k)
      .reduce(
        ([ft, bt], fieldName) => {
          const irrelevantCloze = clozeTemplateFor.call(this, fieldName)
          return [
            ft.replace(irrelevantCloze, ""),
            bt.replace(irrelevantCloze, ""),
          ]
        },
        [front, back]
      )
    return [fieldsAndValues3, qt, at]
  }
}

export function simpleFieldReplacer(
  previous: string,
  fieldName: string,
  value: string
) {
  return previous.replace(`{{${fieldName}}}`, value)
}

function replaceFields(
  this: RenderContainer,
  fieldsAndValues: ReadonlyArray<readonly [string, string]>,
  isFront: boolean,
  template: string
): string {
  return fieldsAndValues.reduce((previous, [fieldName, value]) => {
    const simple = this.simpleFieldReplacer(previous, fieldName, value)

    const showIfHasText = (() => {
      const fieldName2 = escapeRegExp(fieldName)
      const regex = new RegExp(`{{#${fieldName2}}}(.*?){{/${fieldName2}}}`, "s")
      return isNullOrWhitespace(value)
        ? simple.replace(regex, "")
        : simple.replace(regex, "$1")
    })()

    const showIfEmpty: string = (() => {
      const fieldName2 = escapeRegExp(fieldName)
      const regex = new RegExp(
        `{{\\^${fieldName2}}}(.*?){{/${fieldName2}}}`,
        "s"
      )
      return isNullOrWhitespace(value)
        ? showIfHasText.replace(regex, "$1")
        : showIfHasText.replace(regex, "")
    })()

    const stripHtml = showIfEmpty.replace(
      `{{text:${fieldName}}}`,
      this.strip(value)
    )

    const cloze = (() => {
      if (isFront) {
        const regexMatches: ReadonlyArray<
          readonly [string | undefined, string]
        > = Array.from(value.matchAll(this.clozeRegex), (x) => [
          x.groups?.hint,
          x[0],
        ])
        const bracketed = regexMatches.reduce((current, [hint, rawCloze]) => {
          const brackets = `
<span class="cloze-brackets-front">[</span>
<span class="cloze-filler-front">${hint ?? "..."}</span>
<span class="cloze-brackets-front">]</span>
`
          return current.replace(rawCloze, brackets)
        }, value)
        return stripHtml.replace(
          clozeTemplateFor.call(this, fieldName),
          bracketed
        )
      } else {
        const answer = value.replace(
          this.clozeRegex,
          `
<span class="cloze-brackets-back">[</span>
$<answer>
<span class="cloze-brackets-back">]</span>
`
        )
        return stripHtml.replace(clozeTemplateFor.call(this, fieldName), answer)
      }
    })()
    return cloze
  }, template)
}

function buildHtml(body: string, css: string): string {
  return `
<!DOCTYPE html>
    <head>
        <style>
            .cloze-brackets-front {
                font-size: 150%%;
                font-family: monospace;
                font-weight: bolder;
                color: dodgerblue;
            }
            .cloze-filler-front {
                font-size: 150%%;
                font-family: monospace;
                font-weight: bolder;
                color: dodgerblue;
            }
            .cloze-brackets-back {
                font-size: 150%%;
                font-family: monospace;
                font-weight: bolder;
                color: red;
            }
        </style>
        <style>
            ${css}
        </style>
    </head>
    <body>
        ${body}
    </body>
</html>
`
}

export function html(
  this: RenderContainer,
  fieldsAndValues: ReadonlyArray<readonly [string, string]>,
  ord: Ord,
  template: Template
): readonly [string, string] | null {
  const body2 = this.body(fieldsAndValues, ord, template)
  if (body2 === null) {
    return null
  } else {
    return [
      buildHtml(body2[0], template.css),
      buildHtml(body2[1], template.css),
    ] as const
  }
}

export function renderTemplate(
  this: RenderContainer,
  template: Template
): ReadonlyArray<readonly [string, string] | null> {
  const getStandardFieldAndValue = (
    field: Field
  ): readonly [string, string] => {
    return [field.name, `(${field.name})`] as const
  }
  const fieldsAndValues = template.fields.map(getStandardFieldAndValue) // medTODO consider adding escape characters so you can do e.g. {{Front}}. Apparently Anki doesn't have escape characters - now would be a good time to introduce this feature.
  if (template.templateType.tag === "standard") {
    return template.templateType.templates.map(({ id }) =>
      this.body(fieldsAndValues, id, template)
    )
  } else if (template.templateType.tag === "cloze") {
    const getFieldsAndValues = (
      clozeField: string,
      i: number
    ): Array<readonly [string, string]> =>
      template.fields.map((f) => {
        return f.name === clozeField
          ? ([
              f.name,
              `This is a cloze deletion for {{c${i + 1}::${f.name}}}.`,
            ] as const)
          : getStandardFieldAndValue(f)
      })
    const { front } = template.templateType.template
    return getClozeFields
      .call(this, front)
      .map((clozeField, i) =>
        this.body(getFieldsAndValues(clozeField, i), i as Ord, template)
      )
  }
  throw new Error(
    `No renderer found for Template: ${JSON.stringify(template.templateType)}`
  )
}

export function noteOrds(
  this: RenderContainer,
  fieldsAndValues: ReadonlyArray<readonly [string, string]>,
  template: Template
) {
  if (template.templateType.tag === "standard") {
    const ords = template.templateType.templates
      .map((_, i) => {
        const body = this.body(fieldsAndValues, i as Ord, template)
        if (body == null) return null
        return i as Ord
      })
      .filter(notEmpty)
    return distinctAndOrder(ords)
  } else if (template.templateType.tag === "cloze") {
    const ords = fieldsAndValues.flatMap(([, value]) =>
      Array.from(value.matchAll(this.clozeRegex)).map((x) => {
        const clozeIndex =
          x.groups?.clozeIndex ??
          throwExp("This error should never occur - is `clozeRegex` broken?")
        return (parseInt(clozeIndex) - 1) as Ord
      })
    )
    return distinctAndOrder(ords)
  }
  assertNever(template.templateType)
}

function distinctAndOrder(ords: Ord[]) {
  return Array.from(new Set(ords).values()).sort((a, b) => a - b)
}
