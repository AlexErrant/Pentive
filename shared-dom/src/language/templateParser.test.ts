import { test } from 'vitest'
import { parser } from './templateParser'
import { testTree as testTreeOriginal } from '@lezer/generator/dist/test'
import type { Tree } from '@lezer/common'

function testTree(tree: Tree, expect: string) {
	testTreeOriginal(tree, expect, () => false)
}

test('templateParser can parse standard test string', () => {
	const tree = parser.parse(
		`{<div>
  {{main content}}
{{#extra content}}
  <hr></div><div class=extra>{{extra content}}
{{/extra content}}
  <hr>
</div>`,
	)
	const spec = `Document(
Text,
Text,
Element(SelfClosingTag(StartTag,TagName,EndTag)),
Text,
Element(
  OpenTag(StartTag,If,TagName,EndTag),
  Text,
  Element(SelfClosingTag(StartTag,TagName,EndTag)),
  Text,
  CloseTag(StartCloseTag,TagName,EndTag)
),
Text)`
	testTree(tree, spec)
})

test('templateParser can parse cloze test string', () => {
	const tree = parser.parse(`{{type:cloze:Text}}words{foo`)
	const spec = `Document(
Element(
  SelfClosingTag(
    StartTag,
    Transformer(TagName,TransformerDelimiter),
    Transformer(TagName,TransformerDelimiter),
    TagName,
    EndTag
  )
)
Text,
Text,
Text
)`
	testTree(tree, spec)
})
