import { defaultRenderContainer } from './testUtil'
import { describe, expect, test } from 'vitest'
import { type TemplateId, type Ord } from 'shared/brand'
import { type Template } from 'shared/domain/template'
import { throwExp } from 'shared/utility'
import { type Note } from 'shared/domain/note'
import { type Card } from 'shared/domain/card'
import {
	type HtmlResult,
	noteOrds,
	strip,
	toSampleCard,
	toSampleNote,
	getOk as getOkSafe,
} from './cardHtml'

function buildTemplate(
	fieldValues: Array<readonly [string, string]>,
	frontTemplate: string,
	backTemplate: string,
	type: 'standard' | 'cloze',
) {
	return {
		id: '' as TemplateId,
		name: '',
		css: '',
		fields: fieldValues.map(([name]) => ({
			name,
		})),
		created: new Date(),
		edited: new Date(),
		templateType:
			type === 'cloze'
				? {
						tag: 'cloze' as const,
						template: {
							name: '',
							front: frontTemplate,
							back: backTemplate,
							id: 0 as Ord,
						},
					}
				: {
						tag: 'standard' as const,
						templates: [
							{
								name: '',
								front: frontTemplate,
								back: backTemplate,
								id: 0 as Ord,
							},
						],
					},
		remotes: {},
	} satisfies Template
}

export function getOk(result: HtmlResult) {
	return getOkSafe(result) ?? throwExp()
}

function testBody(
	fieldValues: Array<readonly [string, string]>,
	frontTemplate: string,
	backTemplate: string,
	ord: number,
	type: 'standard' | 'cloze',
	expectedFront: string,
	expectedBack: string,
): void {
	const template = buildTemplate(fieldValues, frontTemplate, backTemplate, type)
	const r = defaultRenderContainer.body(
		toSampleCard(ord as Ord),
		toSampleNote(Object.fromEntries(fieldValues)),
		template,
	)
	const [front, back] = getOk(r)
	expect(front).toBe(expectedFront)
	expect(back).toBe(expectedBack)
}

function testBody2(
	fieldValues: Array<readonly [string, string]>,
	frontTemplate: [string, string],
	backTemplate: [string, string],
	type: 'standard' | 'cloze',
	expectedFront: [string | null, string | null],
	expectedBack: [string | null, string | null],
): void {
	const template = buildTemplate(
		fieldValues,
		frontTemplate[0],
		backTemplate[0],
		type,
	)
	template.templateType.templates?.push({
		name: '',
		front: frontTemplate[1],
		back: backTemplate[1],
		id: 1 as Ord,
	})
	for (let index = 0; index < 2; index++) {
		const r = defaultRenderContainer.body(
			toSampleCard(index as Ord),
			toSampleNote(Object.fromEntries(fieldValues)),
			template,
		)
		const [front, back] = getOkSafe(r) ?? [null, null]
		expect(front).toBe(expectedFront[index])
		expect(back).toBe(expectedBack[index])
	}
}

function testStrippedBody(
	fieldValues: Array<readonly [string, string]>,
	frontTemplate: string,
	backTemplate: string,
	ord: number,
	type: 'standard' | 'cloze',
	expectedFront: string,
	expectedBack: string,
): void {
	const template = buildTemplate(fieldValues, frontTemplate, backTemplate, type)
	const [front, back] = getOk(
		defaultRenderContainer.body(
			toSampleCard(ord as Ord),
			toSampleNote(Object.fromEntries(fieldValues)),
			template,
		),
	)
	expectStrippedToBe(front, expectedFront)
	expectStrippedToBe(back, expectedBack)
}

function expectStrippedToBe(html: string, expected: string): void {
	const newline = /[\r\n]/g
	expect(strip(html).replace(newline, '').trim()).toBe(expected)
}

function testBodyIsNull(
	fieldValues: Array<readonly [string, string]>,
	frontTemplate: string,
	backTemplate: string,
	ord: number,
	type: 'standard' | 'cloze',
): void {
	const template = buildTemplate(fieldValues, frontTemplate, backTemplate, type)
	const result = defaultRenderContainer.body(
		toSampleCard(ord as Ord),
		toSampleNote(Object.fromEntries(fieldValues)),
		template,
	)
	expect(getOkSafe(result)).toBeNull()
}

test('CardHtml generates proper basic card template', () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
		],
		'{{Front}}',
		`{{FrontSide}}
  <hr id=answer>
  {{Back}}`,
		0,
		'standard',
		'What is the capital of Canada?',
		`What is the capital of Canada?
  <hr id=answer>
  Ottawa`,
	)
})

test('CardHtml generates empty string when Front field is missing', () => {
	testBodyIsNull(
		[
			['Back', 'Ottawa'],
			['FrontX', 'What is the capital of Canada?'],
		],
		'{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
	)
})

test('CardHtml generates proper basic with optional reversed custom card template', () => {
	testBody2(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Back2', 'Canada'],
			['Front2', 'What is Ottawa the capital of?'],
		],
		['{{#Front}}{{Front}}{{/Front}}', '{{#Front2}}{{Front2}}{{/Front2}}'],
		[
			`{{FrontSide}}<hr id=answer>{{Back}}`,
			`{{FrontSide}}<hr id=answer>{{Back2}}`,
		],
		'standard',
		['What is the capital of Canada?', 'What is Ottawa the capital of?'],
		[
			`What is the capital of Canada?<hr id=answer>Ottawa`,
			`What is Ottawa the capital of?<hr id=answer>Canada`,
		],
	)
})

test('CardHtml generates proper basic with optional reversed custom card template, with outer div', () => {
	testBody2(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Back2', 'Canada'],
			['Front2', 'What is Ottawa the capital of?'],
		],
		[
			'<div>{{#Front}}{{Front}}{{/Front}}</div>',
			'<div>{{#Front2}}{{Front2}}{{/Front2}}</div>',
		],
		[
			`<div>{{FrontSide}}<hr id=answer>{{Back}}</div>`,
			`<div>{{FrontSide}}<hr id=answer>{{Back2}}</div>`,
		],
		'standard',
		[
			'<div>What is the capital of Canada?</div>',
			'<div>What is Ottawa the capital of?</div>',
		],
		[
			`<div><div>What is the capital of Canada?</div><hr id=answer>Ottawa</div>`,
			`<div><div>What is Ottawa the capital of?</div><hr id=answer>Canada</div>`,
		],
	)
})

test.each([
	{ name: 'empty string', value: '' },
	{ name: 'space', value: ' ' },
	{ name: 'newline', value: '\r\n' },
])(
	'CardHtml generates proper basic with optional reversed custom card template, with outer div, and using optional reversed - $name',
	({ value }) => {
		testBody2(
			[
				['Back', 'Ottawa'],
				['Front', 'What is the capital of Canada?'],
				['Back2', value], // grep 541E2B56-BC18-48B1-9CC8-6A731A97CD03
				['Front2', value],
			],
			[
				'<div>{{#Front}}{{Front}}{{/Front}}</div>',
				'<div>{{#Front2}}{{Front2}}{{/Front2}}</div>',
			],
			[
				`<div>{{FrontSide}}<hr id=answer>{{Back}}</div>`,
				`<div>{{FrontSide}}<hr id=answer>{{Back2}}</div>`,
			],
			'standard',
			['<div>What is the capital of Canada?</div>', null],
			[
				`<div><div>What is the capital of Canada?</div><hr id=answer>Ottawa</div>`,
				null,
			],
		)
	},
)

test.each([
	{ name: 'empty string', value: '' },
	{ name: 'space', value: ' ' },
	{ name: 'newline', value: '\r\n' },
])(
	'CardHtml generates proper basic with optional reversed custom card template, with outer div, and using inverted optional reversed for contrived reasons - $name',
	({ value }) => {
		testBody2(
			[
				['Back', 'Ottawa'],
				['Front', 'What is the capital of Canada?'],
				['Back2', value], // grep 541E2B56-BC18-48B1-9CC8-6A731A97CD03
				['Front2', value],
			],
			[
				'<div>{{^Front}}{{Front}}{{/Front}}</div>',
				'<div>{{^Front2}}{{Front2}}{{/Front2}}</div>',
			],
			[
				`<div>{{FrontSide}}<hr id=answer>{{Back}}</div>`,
				`<div>{{FrontSide}}<hr id=answer>{{Back2}}</div>`,
			],
			'standard',
			[null, null],
			[null, null],
		)
	},
)

test('CardHtml generates proper basic card template, but with (empty) conditional Category', () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', ''],
		],
		'{{#Category}}Category: {{Category}}<br/>{{/Category}}{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		'What is the capital of Canada?',
		`What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test("CardHtml generates proper basic card template, but with conditional Category that's shown", () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', 'Nations and Capitals'],
		],
		'{{#Category}}Category: {{Category}}<br/>{{/Category}}{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		'Category: Nations and Capitals<br/>What is the capital of Canada?',
		`Category: Nations and Capitals<br/>What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test("CardHtml generates proper basic card template, but with conditional Category that's shown, and is nested inside itself", () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', 'Nations and Capitals'],
		],
		'{{#Category}}{{#Category}}Category: {{Category}}<br/>{{/Category}}{{/Category}}{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		'Category: Nations and Capitals<br/>What is the capital of Canada?',
		`Category: Nations and Capitals<br/>What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test("CardHtml generates proper basic card template, but with conditional Category that's shown, with newlines", () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', 'Nations and Capitals'],
		],
		`{{#Category}}
Category: {{Category}}<br/>
{{/Category}}
{{Front}}`,
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		`Category: Nations and Capitals<br/>

What is the capital of Canada?`,
		`Category: Nations and Capitals<br/>

What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test('CardHtml generates proper basic card template, with conditional Category (inverted and empty)', () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', ''],
		],
		'{{^Category}}Category: {{Category}}No category was given<br/>{{/Category}}{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		'Category: No category was given<br/>What is the capital of Canada?',
		`Category: No category was given<br/>What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test('CardHtml generates proper basic card template, with conditional Category (inverted and empty and with newlines)', () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', ''],
		],
		`{{^Category}}
Category: {{Category}}No category was given<br/>
{{/Category}}
{{Front}}`,
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		`Category: No category was given<br/>

What is the capital of Canada?`,
		`Category: No category was given<br/>

What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test('CardHtml generates proper basic card template, with conditional Category (inverted and populated)', () => {
	testBody(
		[
			['Back', 'Ottawa'],
			['Front', 'What is the capital of Canada?'],
			['Category', 'Nations and Capitals'],
		],
		'{{^Category}}Category: {{Category}}No category was given<br/>{{/Category}}{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
		0,
		'standard',
		'What is the capital of Canada?',
		`What is the capital of Canada?
    <hr id=answer>
    Ottawa`,
	)
})

test('CardHtml renders {{text:FieldName}} properly', () => {
	testBody(
		[
			['Back', '<b>Ottawa</b>'],
			['Front', 'What is the capital of Canada?'],
		],
		'{{Front}}',
		`{{FrontSide}}
    <hr id=answer>
    {{Back}}<br/><a href="http://example.com/search?q={{text:Back}}">check in dictionary</a>`,
		0,
		'standard',
		'What is the capital of Canada?',
		`What is the capital of Canada?
    <hr id=answer>
    <b>Ottawa</b><br/><a href="http://example.com/search?q=Ottawa">check in dictionary</a>`,
	)
})

test('CardHtml renders {{cloze:FieldName}} properly', () => {
	testBody(
		[
			['Text', 'Canberra was founded in {{c1::1913}}.'],
			['Extra', 'Some extra stuff.'],
		],
		'{{cloze:Text}}',
		`{{cloze:Text}}<br>{{Extra}}`,
		0,
		'cloze',
		`Canberra was founded in 
<span class="cloze-brackets-front">[</span>
<span class="cloze-filler-front">...</span>
<span class="cloze-brackets-front">]</span>
.`,
		`Canberra was founded in 
<span class="cloze-brackets-back">[</span>
1913
<span class="cloze-brackets-back">]</span>
.<br>Some extra stuff.`,
	)
})

function ordsOfStandard(
	fieldAndValues: Array<readonly [string, string]>,
	frontTemplates: [string, string],
	backTemplates: [string, string],
) {
	const template = buildTemplate(
		fieldAndValues,
		frontTemplates[0],
		backTemplates[0],
		'standard',
	)
	template.templateType.templates?.push({
		name: '',
		front: frontTemplates[1],
		back: backTemplates[1],
		id: 1 as Ord,
	})
	return noteOrds.bind(defaultRenderContainer)(
		toSampleNote(Object.fromEntries(fieldAndValues)),
		template,
	)
}

test.each([
	{ name: 'empty string', value: '', expected: [0] },
	{ name: 'space', value: ' ', expected: [0] },
	{ name: 'newline', value: '\r\n', expected: [0] },
	{ name: 'foo', value: 'foo', expected: [0, 1] },
])(
	'noteOrd handles standard template with optional - $name',
	({ value, expected }) => {
		const ords = ordsOfStandard(
			[
				['Back', 'Ottawa'],
				['Front', 'What is the capital of Canada?'],
				['Back2', value],
				['Front2', value],
			],
			[
				'<div>{{#Front}}{{Front}}{{/Front}}</div>',
				'<div>{{#Front2}}{{Front2}}{{/Front2}}</div>',
			],
			[
				`<div>{{FrontSide}}<hr id=answer>{{Back}}</div>`,
				`<div>{{FrontSide}}<hr id=answer>{{Back2}}</div>`,
			],
		)
		expect(ords).toStrictEqual(expected)
	},
)

function ordsOfClozeNote(
	fieldsAndValues: Array<[string, string]>,
	front: string,
	back: string,
) {
	return noteOrds.bind(defaultRenderContainer)(
		toSampleNote(Object.fromEntries(fieldsAndValues)),
		buildTemplate(fieldsAndValues, front, back, 'cloze'),
	)
}

test('maxOrdNote of {{cloze:FieldName}} yields 1', () => {
	const ords = ordsOfClozeNote(
		[
			['Text', 'Canberra was founded in {{c1::1913}}.'],
			['Extra', 'Some extra stuff.'],
		],
		'{{cloze:Text}}',
		`{{cloze:Text}}<br>{{Extra}}`,
	)
	expect(ords).toStrictEqual([0])
})

test('CardHtml renders multiple cloze templates properly 1', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		`{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}`,
		0,
		'cloze',
		'Columbus first crossed the Atlantic in [ ... ]',
		`Columbus first crossed the Atlantic in [ 1492 ] Some extra info`,
	)
})

test('CardHtml renders multiple cloze templates properly 2', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		`{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}`,
		1,
		'cloze',
		'In [ ... ] , Columbus sailed the ocean blue.',
		'In [ 1492 ] , Columbus sailed the ocean blue. Some extra info',
	)
})

test('CardHtml renders multiple cloze templates properly 3', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		2,
		'cloze',
		'In 1492, Columbus sailed the ocean [ ... ] .',
		'In 1492, Columbus sailed the ocean [ blue ] . Some extra info',
	)
})

test('maxOrdNote of multiple cloze fields works', () => {
	const ords = ordsOfClozeNote(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In {{c2::1492}}, Columbus sailed the ocean {{c3::blue}}.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
	)
	expect(ords).toStrictEqual([0, 1, 2])
})

test('CardHtml renders multiple cloze templates properly 4', () => {
	testStrippedBody(
		[
			['Field1', '{{c1::Columbus}} first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In 1492, Columbus sailed the ocean blue.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		0,
		'cloze',
		'[ ... ] first crossed the Atlantic in [ ... ]',
		'[ Columbus ] first crossed the Atlantic in [ 1492 ] Some extra info',
	)
})

test('maxOrdNote of multiple cloze fields with the same index works', () => {
	const ords = ordsOfClozeNote(
		[
			['Field1', '{{c1::Columbus}} first crossed the Atlantic in {{c1::1492}}'],
			['Field2', 'In 1492, Columbus sailed the ocean blue.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
	)
	expect(ords).toStrictEqual([0])
})

test('CardHtml renders {{cloze:FieldName}} properly with hint', () => {
	testStrippedBody(
		[
			['Text', 'Canberra was founded in {{c1::1913::year}}.'],
			['Extra', 'Some extra stuff.'],
		],
		'{{cloze:Text}}',
		'{{cloze:Text}}<br>{{Extra}}',
		0,
		'cloze',
		'Canberra was founded in [ year ] .',
		'Canberra was founded in [ 1913 ] . Some extra stuff.',
	)
})

test('CardHtml renders multiple cloze templates properly 1 with hint', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492::year}}'],
			[
				'Field2',
				'In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.',
			],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		0,
		'cloze',
		'Columbus first crossed the Atlantic in [ year ]',
		'Columbus first crossed the Atlantic in [ 1492 ] Some extra info',
	)
})

test('CardHtml renders multiple cloze templates properly 2 with hint', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492::year}}'],
			[
				'Field2',
				'In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.',
			],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		1,
		'cloze',
		'In [ year ] , Columbus sailed the ocean blue.',
		'In [ 1492 ] , Columbus sailed the ocean blue. Some extra info',
	)
})

test('CardHtml renders multiple cloze templates properly 3 with hint', () => {
	testStrippedBody(
		[
			['Field1', 'Columbus first crossed the Atlantic in {{c1::1492::year}}'],
			[
				'Field2',
				'In {{c2::1492::year}}, Columbus sailed the ocean {{c3::blue::color}}.',
			],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		2,
		'cloze',
		'In 1492, Columbus sailed the ocean [ color ] .',
		'In 1492, Columbus sailed the ocean [ blue ] . Some extra info',
	)
})

test('CardHtml renders multiple cloze templates properly 4 with hint', () => {
	testStrippedBody(
		[
			[
				'Field1',
				'{{c1::Columbus::person}} first crossed the Atlantic in {{c1::1492::year}}',
			],
			['Field2', 'In 1492, Columbus sailed the ocean blue.'],
			['Extra', 'Some extra info'],
		],
		'{{cloze:Field1}}{{cloze:Field2}}',
		'{{cloze:Field1}}{{cloze:Field2}}<br>{{Extra}}',
		0,
		'cloze',
		'[ person ] first crossed the Atlantic in [ year ]',
		'[ Columbus ] first crossed the Atlantic in [ 1492 ] Some extra info',
	)
})

function expectTemplate(
	template: HtmlResult,
	expectedFront: string,
	expectedBack: string,
): void {
	expect(template).not.toBeNull()
	const [front, back] = getOk(template)
	expectStrippedToBe(front, expectedFront)
	expectStrippedToBe(back, expectedBack)
}

test('renderTemplate works for 1 cloze', () => {
	const cloze = {
		id: '' as TemplateId,
		name: '',
		created: new Date(),
		edited: new Date(),
		remotes: {},
		css: '',
		fields: [{ name: 'Text' }, { name: 'Extra' }],
		templateType: {
			tag: 'cloze' as const,
			template: {
				id: 0 as Ord,
				name: 'Cloze',
				front: '{{cloze:Text}}',
				back: '{{cloze:Text}}{{Extra}}',
			},
		},
	}
	const templates = defaultRenderContainer.renderTemplate(cloze)
	expect(templates.length).toBe(1)
	const [template] = templates
	expectTemplate(
		template!,
		'This is a cloze deletion for [ ... ] .',
		'This is a cloze deletion for [ Text ] .(Extra)',
	)
})

test('renderTemplate works for 2 cloze deletions', () => {
	const cloze = {
		id: '' as TemplateId,
		name: '',
		created: new Date(),
		edited: new Date(),
		remotes: {},
		css: '',
		fields: [{ name: 'Text1' }, { name: 'Text2' }, { name: 'Extra' }],
		templateType: {
			tag: 'cloze' as const,
			template: {
				id: 0 as Ord,
				name: 'Cloze',
				front: '{{cloze:Text1}}{{cloze:Text2}}',
				back: '{{cloze:Text1}}{{cloze:Text2}}{{Extra}}',
			},
		},
	}
	const templates = defaultRenderContainer.renderTemplate(cloze)
	expect(templates.length).toBe(2)
	const [template1, template2] = templates
	expectTemplate(
		template1!,
		'This is a cloze deletion for [ ... ] .',
		'This is a cloze deletion for [ Text1 ] .(Extra)',
	)
	expectTemplate(
		template2!,
		'This is a cloze deletion for [ ... ] .',
		'This is a cloze deletion for [ Text2 ] .(Extra)',
	)
})

test('renderTemplate works for standard with 1 child template', () => {
	const standard = {
		id: '' as TemplateId,
		name: '',
		created: new Date(),
		edited: new Date(),
		remotes: {},
		css: '',
		fields: [{ name: 'English' }, { name: 'Spanish' }],
		templateType: {
			tag: 'standard' as const,
			templates: [
				{
					id: 0 as Ord,
					name: 'e2s',
					front: '{{English}}',
					back: '{{English}}-{{Spanish}}',
				},
			],
		},
	}
	const templates = defaultRenderContainer.renderTemplate(standard)
	expect(templates.length).toBe(1)
	const [template] = templates
	expectTemplate(template!, '(English)', '(English)-(Spanish)')
})

test('renderTemplate works for standard with 2 child templates', () => {
	const standard = {
		id: '' as TemplateId,
		name: '',
		created: new Date(),
		edited: new Date(),
		remotes: {},
		css: '',
		fields: [{ name: 'English' }, { name: 'Spanish' }],
		templateType: {
			tag: 'standard' as const,
			templates: [
				{
					id: 0 as Ord,
					name: 'e2s',
					front: '{{English}}',
					back: '{{English}}-{{Spanish}}',
				},
				{
					id: 1 as Ord,
					name: 's2e',
					front: '{{Spanish}}',
					back: '{{Spanish}}-{{English}}',
				},
			],
		},
	}
	const templates = defaultRenderContainer.renderTemplate(standard)
	expect(templates.length).toBe(2)
	const [template1, template2] = templates
	expectTemplate(template1!, '(English)', '(English)-(Spanish)')
	expectTemplate(template2!, '(Spanish)', '(Spanish)-(English)')
})

function toTestNote(
	fieldValues: Record<string, string>,
	note: Partial<Note>,
): Note {
	const sampleNote = toSampleNote(fieldValues)
	return {
		...sampleNote,
		...note,
	}
}

function toBody(
	card: Card,
	note: Note,
	template: Template,
	short = false,
) {
	return getOk(defaultRenderContainer.body(card, note, template, short))
}

describe('standardTemplate tags', () => {
	const fieldValues = [
		['Back', 'Ottawa'],
		['Front', 'What is the capital of Canada?'],
	] as Array<[string, string]>

	test('CardHtml generates proper basic card template with no tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), { tags: new Set() }),
				buildTemplate(
					fieldValues,
					'{{Front}}{{Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?')
		expect(back).toBe(`What is the capital of Canada?
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 1 tag', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?Geography')
		expect(back).toBe(`What is the capital of Canada?Geography
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 2 tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography', 'Capital']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?Geography, Capital')
		expect(back).toBe(`What is the capital of Canada?Geography, Capital
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with no conditional tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), { tags: new Set() }),
				buildTemplate(
					fieldValues,
					'{{Front}}{{#Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?')
		expect(back).toBe(`What is the capital of Canada?
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 1 conditional tag', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{#Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?Tags: Geography')
		expect(back).toBe(`What is the capital of Canada?Tags: Geography
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 2 conditional tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography', 'Capital']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{#Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?Tags: Geography, Capital')
		expect(back).toBe(`What is the capital of Canada?Tags: Geography, Capital
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with no antiConditional tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), { tags: new Set() }),
				buildTemplate(
					fieldValues,
					'{{Front}}{{^Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?Tags:')
		expect(back).toBe(`What is the capital of Canada?Tags:
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 1 antiConditional tag', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{^Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?')
		expect(back).toBe(`What is the capital of Canada?
    <hr id=answer>
    Ottawa`)
	})

	test('CardHtml generates proper basic card template with 2 antiConditional tags', () => {
		const [front, back] =
			toBody(
				toSampleCard(0 as Ord),
				toTestNote(Object.fromEntries(fieldValues), {
					tags: new Set(['Geography', 'Capital']),
				}),
				buildTemplate(
					fieldValues,
					'{{Front}}{{^Tags}}Tags: {{Tags}}{{/Tags}}',
					`{{FrontSide}}
    <hr id=answer>
    {{Back}}`,
					'standard',
				),
			) ?? throwExp()
		expect(front).toBe('What is the capital of Canada?')
		expect(back).toBe(`What is the capital of Canada?
    <hr id=answer>
    Ottawa`)
	})
})
