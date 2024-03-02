import { test } from 'vitest'
import { parser } from './templateParser'
import { testTree } from '@lezer/generator/dist/test'

test('templateParser can parse standard test string', () => {
	const tree = parser.parse(
		`{<div>
  {{main content}}
{{#extra content}}
  <hr></div><div class=extra>{{extra content}}
{{/extra content}}
  <hr>
</div>
`,
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
