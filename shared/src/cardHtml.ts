import { type RenderContainer } from "./renderContainer.js"
import {
  type NoteId,
  type TemplateId,
  type Ord,
  type NookId,
  type RemoteNoteId,
  type CardId,
  type DeckId,
  type CardSettingId,
} from "./brand.js"
import { assertNever, notEmpty, throwExp } from "./utility.js"
import { type Cloze, type Standard } from "./schema.js"
import { type Field, type Template } from "./domain/template.js"
import { type Card } from "./domain/card.js"
import { type Note } from "./domain/note.js"

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
  card: Card,
  note: Note,
  template: Template
): readonly [string, string] | null {
  if (template.templateType.tag === "standard") {
    return handleStandard.call(this, card, note, template as StandardTemplate)
  } else if (template.templateType.tag === "cloze") {
    return handleCloze.call(this, card, note, template as ClozeTemplate)
  } else {
    assertNever(template.templateType)
  }
}
export interface ReplacerArgs {
  initialValue: string
  isFront: boolean
  card: Card
  note: Note
  template: Template
}

export type StandardReplacerArgs = Omit<ReplacerArgs, "template"> & {
  template: StandardTemplate
}

export type ClozeReplacerArgs = Omit<ReplacerArgs, "template"> & {
  template: ClozeTemplate
}

export type Replacers = Map<
  string,
  (this: RenderContainer, args: ReplacerArgs) => string
>

export type StandardReplacer = (
  this: RenderContainer,
  args: StandardReplacerArgs
) => string

export const standardReplacers: Map<string, StandardReplacer> = new Map<
  string,
  StandardReplacer
>([
  ["simpleFieldReplacer", simpleFieldReplacer],
  ["conditionalReplacer", conditionalReplacer],
  ["antiConditionalReplacer", antiConditionalReplacer],
  ["tagReplacer", tagReplacer],
  ["stripHtmlReplacer", stripHtmlReplacer],
])

function handleStandard(
  this: RenderContainer,
  card: Card,
  note: Note,
  template: StandardTemplate
) {
  const { front, back } =
    template.templateType.templates.find((t) => t.id === card.ord) ??
    throwExp(`Ord ${card.ord} not found`)
  function replaceFields(
    this: RenderContainer,
    isFront: boolean,
    seed: string
  ) {
    let r = seed
    const args = {
      initialValue: seed,
      isFront,
      card,
      note,
      template,
    }
    for (const [, replacer] of this.standardReplacers) {
      args.initialValue = r
      r = replacer.bind(this)(args)
    }
    return r
  }
  const frontSide = replaceFields.call(this, true, front)
  if (frontSide === front) {
    return null
  } else {
    const backSide = replaceFields
      .call(this, false, back)
      .replace("{{FrontSide}}", replaceFields.call(this, false, front))
    return [frontSide, backSide] as const
  }
}

export type ClozeReplacer = (
  this: RenderContainer,
  args: ClozeReplacerArgs
) => string

export const clozeReplacers: Map<string, ClozeReplacer> = new Map<
  string,
  ClozeReplacer
>([
  ["simpleFieldReplacer", simpleFieldReplacer],
  ["conditionalReplacer", conditionalReplacer],
  ["antiConditionalReplacer", antiConditionalReplacer],
  ["stripHtmlReplacer", stripHtmlReplacer],
  ["tagReplacer", tagReplacer],
  ["clozeReplacer", clozeReplacer],
])

function handleCloze(
  this: RenderContainer,
  card: Card,
  note: Note,
  template: ClozeTemplate
) {
  const { front, back } = template.templateType.template
  function replaceFields(
    this: RenderContainer,
    isFront: boolean,
    seed: string
  ) {
    let r = seed
    const args = {
      initialValue: seed,
      isFront,
      card,
      note,
      template,
    }
    for (const [, replacer] of this.clozeReplacers) {
      args.initialValue = r
      r = replacer.bind(this)(args)
    }
    return r
  }
  const frontSide = replaceFields.call(this, true, front)
  if (frontSide === front) {
    return null
  } else {
    const backSide = replaceFields
      .call(this, false, back)
      .replace("{{FrontSide}}", replaceFields.call(this, false, front))
    return [frontSide, backSide] as const
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

export function simpleFieldReplacer(
  this: RenderContainer,
  { initialValue, isFront, card, note, template }: ReplacerArgs
) {
  let r = initialValue
  note.fieldValues.forEach((value, fieldName) => {
    r = r.replace(`{{${fieldName}}}`, value)
  })
  return r
}

function tagReplacer(this: RenderContainer, args: ReplacerArgs) {
  const replacersMap =
    args.template.templateType.tag === "standard"
      ? (this.standardReplacers as Replacers)
      : (this.clozeReplacers as Replacers)
  const replacers = [
    replacersMap.get("simpleFieldReplacer"),
    replacersMap.get("conditionalReplacer"),
    replacersMap.get("antiConditionalReplacer"),
  ].filter(notEmpty)
  let r = args.initialValue
  const args2 = {
    ...args,
    note: {
      ...args.note,
      fieldValues: new Map([
        ["Tags", Array.from(args.note.tags.keys()).join(", ")],
      ]),
    },
  }
  for (const replacer of replacers) {
    args2.initialValue = r
    r = replacer.call(this, args2)
  }
  return r
}

function conditionalReplacer(
  this: RenderContainer,
  { initialValue, isFront, card, note, template }: ReplacerArgs
) {
  let r = initialValue
  note.fieldValues.forEach((value, fieldName) => {
    const fieldName2 = escapeRegExp(fieldName)
    const regex = new RegExp(`{{#${fieldName2}}}(.*?){{/${fieldName2}}}`, "s")
    r = isNullOrWhitespace(value)
      ? r.replace(regex, "")
      : r.replace(regex, "$1")
  })
  return r
}

function antiConditionalReplacer(
  this: RenderContainer,
  { initialValue, isFront, card, note, template }: ReplacerArgs
) {
  let r = initialValue
  note.fieldValues.forEach((value, fieldName) => {
    const fieldName2 = escapeRegExp(fieldName)
    const regex = new RegExp(`{{\\^${fieldName2}}}(.*?){{/${fieldName2}}}`, "s")
    r = isNullOrWhitespace(value)
      ? r.replace(regex, "$1")
      : r.replace(regex, "")
  })
  return r
}

function stripHtmlReplacer(
  this: RenderContainer,
  { initialValue, isFront, card, note, template }: ReplacerArgs
) {
  let r = initialValue
  note.fieldValues.forEach((value, fieldName) => {
    r = r.replace(`{{text:${fieldName}}}`, this.strip(value))
  })
  return r
}

function clozeReplacer(
  this: RenderContainer,
  { initialValue, isFront, card, note, template }: ClozeReplacerArgs
) {
  let r = initialValue
  note.fieldValues.forEach((value, fieldName) => {
    const i = (card.ord.valueOf() + 1).toString()
    const clozeFields = getClozeFields.call(
      this,
      template.templateType.template.front
    )
    const indexMatch = Array.from(
      value.matchAll(this.clozeRegex),
      (x) =>
        x.groups?.clozeIndex ??
        throwExp("This error should never occur - is `clozeRegex` broken?")
    ).includes(i)
    if (!indexMatch && clozeFields.includes(fieldName)) {
      value = ""
    } else {
      value = Array.from(value.matchAll(this.clozeRegex))
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
    }
    if (isFront) {
      const regexMatches: ReadonlyArray<readonly [string | undefined, string]> =
        Array.from(value.matchAll(this.clozeRegex), (x) => [
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
      r = r.replace(clozeTemplateFor.call(this, fieldName), bracketed)
    } else {
      const answer = value.replace(
        this.clozeRegex,
        `
<span class="cloze-brackets-back">[</span>
$<answer>
<span class="cloze-brackets-back">]</span>
`
      )
      r = r.replace(clozeTemplateFor.call(this, fieldName), answer)
    }
  })
  return r
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
  card: Card,
  note: Note,
  template: Template
): readonly [string, string] | null {
  const body2 = this.body(card, note, template)
  if (body2 === null) {
    return null
  } else {
    return [
      buildHtml(body2[0], template.css),
      buildHtml(body2[1], template.css),
    ] as const
  }
}

export function toSampleNote(fieldValues: Map<string, string>): Note {
  return {
    id: "SampleNoteId" as NoteId,
    templateId: "SampleTemplateId" as TemplateId,
    created: new Date(),
    updated: new Date(),
    tags: new Set(["SampleTag"]),
    fieldValues,
    remotes: new Map([
      ["SampleNookId" as NookId, "SampleRemoteNoteId" as RemoteNoteId],
    ]),
  }
}

export function toSampleCard(ord: Ord): Card {
  return {
    id: "SampleCardId" as CardId,
    ord,
    noteId: "SampleNoteId" as NoteId,
    deckIds: new Set(["SampleDeckId" as DeckId]),
    created: new Date(),
    updated: new Date(),
    cardSettingId: "SampleCardSettingId" as CardSettingId,
    due: new Date(),
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
  const fieldsAndValues = new Map(template.fields.map(getStandardFieldAndValue)) // medTODO consider adding escape characters so you can do e.g. {{Front}}. Apparently Anki doesn't have escape characters - now would be a good time to introduce this feature.
  if (template.templateType.tag === "standard") {
    const note = toSampleNote(fieldsAndValues)
    return template.templateType.templates.map(({ id }) =>
      this.body(toSampleCard(id), note, template)
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
        this.body(
          toSampleCard(i as Ord),
          toSampleNote(new Map(getFieldsAndValues(clozeField, i))),
          template
        )
      )
  }
  throw new Error(
    `No renderer found for Template: ${JSON.stringify(template.templateType)}`
  )
}

export function noteOrds(
  this: RenderContainer,
  note: Note,
  template: Template
) {
  if (template.templateType.tag === "standard") {
    const ords = template.templateType.templates
      .map((_, i) => {
        const body = this.body(toSampleCard(i as Ord), note, template)
        if (body == null) return null
        return i as Ord
      })
      .filter(notEmpty)
    return distinctAndOrder(ords)
  } else if (template.templateType.tag === "cloze") {
    const ords = Array.from(note.fieldValues.entries()).flatMap(([, value]) =>
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
