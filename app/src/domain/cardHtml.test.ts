import { expect, test } from "vitest"
import { body } from "./cardHtml"
import { ChildTemplateId, ClozeIndex } from "./ids"
import { strip, throwExp } from "./utility"

function testBody(
  fieldValues: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: string | number,
  expectedFront: string,
  expectedBack: string
): void {
  const typedPointer =
    typeof pointer === "string"
      ? (pointer as ChildTemplateId)
      : (pointer as ClozeIndex)
  const [front, back] =
    body(fieldValues, questionTemplate, answerTemplate, typedPointer) ??
    throwExp("should never happen")
  expect(front).toBe(expectedFront)
  expect(back).toBe(expectedBack)
}

function testStrippedBody(
  fieldValues: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: string | number,
  expectedFront: string,
  expectedBack: string
): void {
  const pointer2 =
    typeof pointer === "string"
      ? (pointer as ChildTemplateId)
      : (pointer as ClozeIndex)
  const [front, back] =
    body(fieldValues, questionTemplate, answerTemplate, pointer2) ??
    throwExp("should never happen")
  const newline = /[\r\n]/g
  expect(strip(front).replace(newline, "")).toBe(expectedFront)
  expect(strip(back).replace(newline, "")).toBe(expectedBack)
}

function testBodyIsNull(
  fieldValues: Array<readonly [string, string]>,
  questionTemplate: string,
  answerTemplate: string,
  pointer: string | ClozeIndex
): void {
  const pointer2 =
    typeof pointer === "string" ? (pointer as ChildTemplateId) : pointer
  const result = body(fieldValues, questionTemplate, answerTemplate, pointer2)
  expect(result).toBeNull()
}

test("CardHtml generates proper basic card template", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
    ],
    "{{Front}}",
    `{{FrontSide}}
  <hr id=answer>
  {{Back}}`,
    "",
    "What is the capital of Canada?",
    `What is the capital of Canada?
  <hr id=answer>
  Ottawa`
  )
})

test("CardHtml generates empty string when Front field is missing", () => {
  testBodyIsNull(
    [
      ["Back", "Ottawa"],
      ["FrontX", "What is the capital of Canada?"],
    ],
    "{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    ""
  )
})

test("CardHtml generates proper basic with optional reversed custom card template", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Back2", "Canada"],
      ["Front2", "What is Ottawa the capital of?"],
    ],
    "{{#Front2}}{{Front2}}{{/Front2}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back2}}`,
    "",
    "What is Ottawa the capital of?",
    `What is Ottawa the capital of?
    <hr id=answer>
    Canada`
  )
})

test("CardHtml generates proper basic with optional reversed custom card template, but for {{Front}}", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Back2", "Canada"],
      ["Front2", "What is Ottawa the capital of?"],
    ],
    "{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    "",
    "What is the capital of Canada?",
    `What is the capital of Canada?
    <hr id=answer>
    Ottawa`
  )
})

test("CardHtml generates proper basic card template, but with (empty) conditional Category", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Category", ""],
    ],
    "{{#Category}}Category: {{Category}}<br/>{{/Category}}{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    "",
    "What is the capital of Canada?",
    `What is the capital of Canada?
    <hr id=answer>
    Ottawa`
  )
})

test("CardHtml generates proper basic card template, but with conditional Category that's shown", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Category", "Nations and Capitals"],
    ],
    "{{#Category}}Category: {{Category}}<br/>{{/Category}}{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    "",
    "Category: Nations and Capitals<br/>What is the capital of Canada?",
    `Category: Nations and Capitals<br/>What is the capital of Canada?
    <hr id=answer>
    Ottawa`
  )
})

test("CardHtml generates proper basic card template, with conditional Category (inverted and empty)", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Category", ""],
    ],
    "{{^Category}}Category: {{Category}}No category was given<br/>{{/Category}}{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    "",
    "Category: No category was given<br/>What is the capital of Canada?",
    `Category: No category was given<br/>What is the capital of Canada?
    <hr id=answer>
    Ottawa`
  )
})

test("CardHtml generates proper basic card template, with conditional Category (inverted and populated)", () => {
  testBody(
    [
      ["Back", "Ottawa"],
      ["Front", "What is the capital of Canada?"],
      ["Category", "Nations and Capitals"],
    ],
    "{{^Category}}Category: {{Category}}No category was given<br/>{{/Category}}{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
    "",
    "What is the capital of Canada?",
    `What is the capital of Canada?
    <hr id=answer>
    Ottawa`
  )
})

test("CardHtml renders {{text:FieldName}} properly", () => {
  testBody(
    [
      ["Back", "<b>Ottawa</b>"],
      ["Front", "What is the capital of Canada?"],
    ],
    "{{Front}}",
    `{{FrontSide}}
    <hr id=answer>
    {{Back}}<br/><a href="http://example.com/search?q={{text:Back}}">check in dictionary</a>`,
    "",
    "What is the capital of Canada?",
    `What is the capital of Canada?
    <hr id=answer>
    <b>Ottawa</b><br/><a href="http://example.com/search?q=Ottawa">check in dictionary</a>`
  )
})

test("CardHtml renders {{cloze:FieldName}} properly", () => {
  testBody(
    [
      ["Text", "Canberra was founded in {{c1::1913}}."],
      ["Extra", "Some extra stuff."],
    ],
    "{{cloze:Text}}",
    `{{cloze:Text}}<br>{{Extra}}`,
    0,
    `Canberra was founded in 
<span class="cloze-brackets-front">[</span>
<span class="cloze-filler-front">...</span>
<span class="cloze-brackets-front">]</span>
.`,
    `Canberra was founded in 
<span class="cloze-brackets-back">[</span>
1913
<span class="cloze-brackets-back">]</span>
.<br>Some extra stuff.`
  )
})

test("CardHtml renders multiple cloze templates properly 1", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492}}"],
      ["Field2", "In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}."],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    `{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}`,
    0,
    "Columbus first crossed the Atlantic in [...]",
    `Columbus first crossed the Atlantic in [1492]Some extra info`
  )
})

test("CardHtml renders multiple cloze templates properly 2", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492}}"],
      ["Field2", "In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}."],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    `{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}`,
    1,
    "In [...], Columbus sailed the ocean blue.",
    "In [1492], Columbus sailed the ocean blue.Some extra info"
  )
})

test("CardHtml renders multiple cloze templates properly 3", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492}}"],
      ["Field2", "In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}."],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    2,
    "In 1492, Columbus sailed the ocean [...].",
    "In 1492, Columbus sailed the ocean [blue].Some extra info"
  )
})

test("CardHtml renders multiple cloze templates properly 4", () => {
  testStrippedBody(
    [
      ["Field1", "{{c1::Columbus}} first crossed the Atlantic in {{c1::1492}}"],
      ["Field2", "In 1492, Columbus sailed the ocean blue."],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    0,
    "[...] first crossed the Atlantic in [...]",
    "[Columbus] first crossed the Atlantic in [1492]Some extra info"
  )
})

test("CardHtml renders {{cloze:FieldName}} properly with hint", () => {
  testStrippedBody(
    [
      ["Text", "Canberra was founded in {{c1::1913::year}}."],
      ["Extra", "Some extra stuff."],
    ],
    "{{cloze:Text}}",
    "{{cloze:Text}}<br>{{Extra}}",
    0,
    "Canberra was founded in [year].",
    "Canberra was founded in [1913].Some extra stuff."
  )
})

test("CardHtml renders multiple cloze templates properly 1 with hint", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492::year}}"],
      [
        "Field2",
        "In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.",
      ],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    0,
    "Columbus first crossed the Atlantic in [year]",
    "Columbus first crossed the Atlantic in [1492]Some extra info"
  )
})

test("CardHtml renders multiple cloze templates properly 2 with hint", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492::year}}"],
      [
        "Field2",
        "In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.",
      ],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    1,
    "In [year], Columbus sailed the ocean blue.",
    "In [1492], Columbus sailed the ocean blue.Some extra info"
  )
})

test("CardHtml renders multiple cloze templates properly 3 with hint", () => {
  testStrippedBody(
    [
      ["Field1", "Columbus first crossed the Atlantic in {{c1::1492::year}}"],
      [
        "Field2",
        "In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.",
      ],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    2,
    "In 1492, Columbus sailed the ocean [color].",
    "In 1492, Columbus sailed the ocean [blue].Some extra info"
  )
})

test("CardHtml renders multiple cloze templates properly 4 with hint", () => {
  testStrippedBody(
    [
      [
        "Field1",
        "{{c1::Columbus::person}} first crossed the Atlantic in {{c1::1492::year}}",
      ],
      ["Field2", "In 1492, Columbus sailed the ocean blue."],
      ["Extra", "Some extra info"],
    ],
    "{{cloze:Field1}}{{cloze:Field2}}",
    "{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}",
    0,
    "[person] first crossed the Atlantic in [year]",
    "[Columbus] first crossed the Atlantic in [1492]Some extra info"
  )
})
