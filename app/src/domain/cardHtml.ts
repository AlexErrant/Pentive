import _ from "lodash"
import { ChildTemplateId, ClozeIndex } from "./ids"
import { strip, throwExp } from "./utility"

// These have hidden state - don't use `match` or `exec`!
// https://www.tsmean.com/articles/regex/javascript-regex-match-vs-exec-vs-matchall/
const clozeRegex =
  /{{c(?<clozeIndex>\d+)::(?<answer>.*?)(?:::(?<hint>.*?))?}}/gi
const clozeTemplateRegex = /{{cloze:(?<fieldName>.*?)}}/gi

// https://stackoverflow.com/a/6969486
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // $& means the whole matched string
}

// https://stackoverflow.com/a/32800728
function isNullOrWhitespace(input: string | undefined): boolean {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  return !input || !input.trim()
}

export function body(
  fieldNameValueMap: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: ChildTemplateId | ClozeIndex
): readonly [string, string] | null {
  ;[fieldNameValueMap, questionTemplate, answerTemplate] =
    getFieldNameValueMapQuestionTemplateAnswerTemplate(
      fieldNameValueMap,
      questionTemplate,
      answerTemplate,
      pointer
    )
  const frontSide = replaceFields(fieldNameValueMap, true, questionTemplate)
  if (frontSide === questionTemplate) {
    return null
  } else {
    const backSide = replaceFields(
      fieldNameValueMap,
      false,
      answerTemplate
    ).replace(
      "{{FrontSide}}",
      replaceFields(fieldNameValueMap, false, questionTemplate)
    )
    return [frontSide, backSide]
  }
}

function getFieldNameValueMapQuestionTemplateAnswerTemplate(
  fieldNameValueMap: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: ChildTemplateId | ClozeIndex
): [Array<readonly [string, string]>, string, string] {
  if (pointer.brand === "childTemplateId") {
    return [fieldNameValueMap, questionTemplate, answerTemplate]
  } else {
    const i = (pointer.valueOf() + 1).toString()
    const clozeFields = Array.from(
      questionTemplate.matchAll(clozeTemplateRegex),
      (x) =>
        x.groups?.fieldName ??
        throwExp(
          "This error should never occur - is `clozeTemplateRegex` broken?"
        )
    )
    const [fieldNameValueMap2, unusedFields] = _.partition(
      fieldNameValueMap,
      ([fieldName, value]) => {
        const indexMatch = Array.from(
          value.matchAll(clozeRegex),
          (x) =>
            x.groups?.clozeIndex ??
            throwExp("This error should never occur - is `clozeRegex` broken?")
        ).includes(i)
        return indexMatch || !clozeFields.includes(fieldName)
      }
    )
    const fieldNameValueMap3 = fieldNameValueMap2.map(([fieldName, value]) => {
      const value2 = Array.from(value.matchAll(clozeRegex))
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
        ([qt, at], fieldName) => {
          const irrelevantCloze = `{{cloze:${fieldName}}}`
          return [
            qt.replace(irrelevantCloze, ""),
            at.replace(irrelevantCloze, ""),
          ]
        },
        [questionTemplate, answerTemplate]
      )
    return [fieldNameValueMap3, qt, at]
  }
}

function replaceFields(
  fieldNameValueMap: Array<readonly [string, string]>,
  isFront: boolean,
  template: string
): string {
  return fieldNameValueMap.reduce((previous, [fieldName, value]) => {
    const simple = previous.replace(`{{${fieldName}}}`, value)

    const showIfHasText = (() => {
      const fieldName2 = escapeRegExp(fieldName)
      const regex = new RegExp(`{{#${fieldName2}}}(.*?){{/${fieldName2}}}`)
      return isNullOrWhitespace(value)
        ? simple.replace(regex, "")
        : simple.replace(regex, "$1")
    })()

    const showIfEmpty: string = (() => {
      const fieldName2 = escapeRegExp(fieldName)
      const regex = new RegExp(`{{\\^${fieldName2}}}(.*?){{/${fieldName2}}}`)
      return isNullOrWhitespace(value)
        ? showIfHasText.replace(regex, "$1")
        : showIfHasText.replace(regex, "")
    })()

    const stripHtml = showIfEmpty.replace(`{{text:${fieldName}}}`, strip(value))

    const cloze = (() => {
      if (isFront) {
        const regexMatches: Array<[string | undefined, string]> = Array.from(
          value.matchAll(clozeRegex),
          (x) => [x.groups?.hint, x[0]]
        )
        const bracketed = regexMatches.reduce((current, [hint, rawCloze]) => {
          const brackets = `
<span class="cloze-brackets-front">[</span>
<span class="cloze-filler-front">${hint ?? "..."}</span>
<span class="cloze-brackets-front">]</span>
`
          return current.replace(rawCloze, brackets)
        }, value)
        return stripHtml.replace(`{{cloze:${fieldName}}}`, bracketed)
      } else {
        const answer = value.replace(
          clozeRegex,
          `
<span class="cloze-brackets-back">[</span>
$<answer>
<span class="cloze-brackets-back">]</span>
`
        )
        return stripHtml.replace(`{{cloze:${fieldName}}}`, answer)
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
  fieldNameValueMap: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: ChildTemplateId | ClozeIndex,
  css: string
): readonly [string, string] | null {
  const body2 = body(
    fieldNameValueMap,
    questionTemplate,
    answerTemplate,
    pointer
  )
  if (body2 === null) {
    return null
  } else {
    return body2.map((x) => buildHtml(x, css)) as [string, string]
  }
}
