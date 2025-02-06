import { isEqual, uniqWith } from 'lodash-es'
import { getClozeFields } from './language/template2clozeFields'
import {
	type Error,
	type Warning,
	convert,
	validate,
} from './language/template2html'
import type { RenderContainer } from './renderContainer'
import { assertNever, notEmpty, objEntries, throwExp } from 'shared/utility'
import { type Field, type Template } from 'shared/domain/template'
import { type Card } from 'shared/domain/card'
import { type Note } from 'shared/domain/note'
import {
	type NoteId,
	type TemplateId,
	type Ord,
	type NookId,
	type RemoteNoteId,
	type CardId,
	type CardSettingId,
} from 'shared/brand'
import { type Tree } from '@lezer/common'
import { type Standard, type Cloze } from 'shared/schema'
import { toOneLine } from 'shared/htmlToText'

export type StandardTemplate = Omit<Template, 'templateType'> & {
	templateType: Standard
}

export type ClozeTemplate = Omit<Template, 'templateType'> & {
	templateType: Cloze
}

export const strip = toOneLine

// These have hidden state - don't use `match` or `exec`!
// https://www.tsmean.com/articles/regex/javascript-regex-match-vs-exec-vs-matchall/
const clozeRegex =
	/{{c(?<clozeIndex>\d+)::(?<answer>.*?)(?:::(?<hint>.*?))?}}/gi

export type HtmlResult =
	| {
			tag: 'Ok'
			ok: readonly [string, string] | null
			warnings: Warning[]
	  }
	| {
			tag: 'Error'
			errors: Error[]
	  }

export function getOk(htmlResult: HtmlResult | null | undefined) {
	return htmlResult?.tag === 'Ok' ? htmlResult.ok : null
}

export function body(
	this: RenderContainer,
	card: Card,
	note: Note,
	template: Template,
	short = false,
): HtmlResult {
	let { front, back, shortFront, shortBack } =
		template.templateType.tag === 'standard'
			? (template.templateType.templates.find((t) => t.id === card.ord) ??
				throwExp(`Ord ${card.ord} not found`))
			: template.templateType.template
	if (short) {
		front = shortFront == null || shortFront.trim() === '' ? front : shortFront
		back = shortBack == null || shortBack.trim() === '' ? back : shortBack
	}
	const frontTree = validate.call(this, front)
	if (Array.isArray(frontTree)) return { tag: 'Error', errors: frontTree }
	const backTree = validate.call(this, back)
	if (Array.isArray(backTree)) return { tag: 'Error', errors: backTree }
	const warnings: Warning[] = []
	function c(
		this: RenderContainer,
		input: string,
		tree: Tree,
		isFront: boolean,
	) {
		const r = convert.call(this, input, tree, isFront, card, note, template)
		warnings.push(...r.warnings)
		return r.html
	}
	const getWarnings = () => uniqWith(warnings, (x, y) => isEqual(x, y))
	const frontSide = c.call(this, front, frontTree, true)
	if (frontSide === front || frontSide === '') {
		return { tag: 'Ok', ok: null, warnings: getWarnings() }
	} else {
		const backSide = c
			.call(this, back, backTree, false)
			.replace('{{FrontSide}}', c.call(this, front, frontTree, false))
		if (short)
			return {
				tag: 'Ok',
				ok: [this.strip(frontSide), this.strip(backSide)],
				warnings: getWarnings(),
			}
		return { tag: 'Ok', ok: [frontSide, backSide], warnings: getWarnings() }
	}
}

export interface TransformerArgs {
	initialValue: string
	isFront: boolean
	card: Card
	note: Note
	template: Template
}

export type Transformers = Map<string, Transformer>

export type Transformer = (
	this: RenderContainer,
	args: TransformerArgs,
) => string

export const transformers: Map<string, Transformer> = new Map<
	string,
	Transformer
>([
	['text', textTransformer],
	['cloze', clozeTransformer],
])

function textTransformer(
	this: RenderContainer,
	{ initialValue }: TransformerArgs,
) {
	return this.strip(initialValue)
}

function clozeTransformer(
	this: RenderContainer,
	{ initialValue, isFront, card, note, template }: TransformerArgs,
) {
	let r = initialValue
	if (template.templateType.tag === 'cloze') {
		const i = (card.ord.valueOf() + 1).toString()
		const indexMatch = Array.from(
			r.matchAll(clozeRegex),
			(x) =>
				x.groups?.clozeIndex ??
				throwExp('This error should never occur - is `clozeRegex` broken?'),
		).includes(i)
		if (!indexMatch) {
			r = ''
		} else {
			r = Array.from(r.matchAll(clozeRegex))
				.filter(
					(x) =>
						(x.groups?.clozeIndex ??
							throwExp(
								'This error should never occur - is `clozeRegex` broken?',
							)) !== i,
				)
				.map((x) => ({
					completeMatch: x[0],
					answer:
						x.groups?.answer ??
						throwExp('This error should never occur - is `clozeRegex` broken?'),
				}))
				.reduce(
					(state, { completeMatch, answer }) =>
						state.replace(completeMatch, answer),
					r,
				)
		}
		if (isFront) {
			const regexMatches: ReadonlyArray<readonly [string | undefined, string]> =
				Array.from(r.matchAll(clozeRegex), (x) => [x.groups?.hint, x[0]])
			r = regexMatches.reduce((current, [hint, rawCloze]) => {
				const brackets = `
<span class="cloze-brackets-front">[</span>
<span class="cloze-filler-front">${hint ?? '...'}</span>
<span class="cloze-brackets-front">]</span>
`
				return current.replace(rawCloze, brackets)
			}, r)
		} else {
			r = r.replace(
				clozeRegex,
				`
<span class="cloze-brackets-back">[</span>
$<answer>
<span class="cloze-brackets-back">]</span>
`,
			)
		}
	}
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
	template: Template,
): HtmlResult {
	const body2 = this.body(card, note, template)
	if (body2.tag === 'Error') {
		return body2
	} else {
		if (body2.ok === null) return body2
		const f = buildHtml(body2.ok[0], template.css)
		const b = buildHtml(body2.ok[1], template.css)
		body2.ok = [f, b]
		return body2
	}
}

export function toSampleNote(fieldValues: Record<string, string>): Note {
	return {
		id: 'SampleNoteId' as NoteId,
		templateId: 'SampleTemplateId' as TemplateId,
		created: new Date(),
		edited: new Date(),
		tags: new Set(['SampleTag']),
		fieldValues,
		remotes: {
			['SampleNookId' as NookId]: {
				remoteNoteId: 'SampleRemoteNoteId' as RemoteNoteId,
				uploadDate: new Date(),
			},
		},
	}
}

export function toSampleCard(ord: Ord): Card {
	return {
		id: 'SampleCardId' as CardId,
		ord,
		noteId: 'SampleNoteId' as NoteId,
		tags: new Set(['SampleCardTag']),
		created: new Date(),
		edited: new Date(),
		lapses: 0,
		repCount: 0,
		cardSettingId: 'SampleCardSettingId' as CardSettingId,
		due: new Date(),
	}
}

const getStandardFieldAndValue = (field: Field) =>
	[field.name, `(${field.name})`] as const

export function renderTemplate(
	this: RenderContainer,
	template: Template,
	short = false,
): readonly HtmlResult[] {
	const fieldsAndValues = Object.fromEntries(
		template.fields.map(getStandardFieldAndValue),
	) // medTODO consider adding escape characters so you can do e.g. {{Front}}. Apparently Anki doesn't have escape characters - now would be a good time to introduce this feature.
	if (template.templateType.tag === 'standard') {
		const note = toSampleNote(fieldsAndValues)
		return template.templateType.templates.map(({ id }) =>
			this.body(toSampleCard(id), note, template, short),
		)
	} else if (template.templateType.tag === 'cloze') {
		const getFieldsAndValues = (
			clozeField: string,
			i: number,
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
					toSampleNote(Object.fromEntries(getFieldsAndValues(clozeField, i))),
					template,
					short,
				),
			)
	}
	throw new Error(
		`No renderer found for Template: ${JSON.stringify(template.templateType)}`,
	)
}

export function templateIndexes(this: RenderContainer, template: Template) {
	const length = this.renderTemplate(template).length
	return Array.from(Array(length).keys())
}

export function noteOrds(
	this: RenderContainer,
	note: Note,
	template: Template,
) {
	if (template.templateType.tag === 'standard') {
		const ords = template.templateType.templates
			.map((_, i) => {
				const body = this.body(toSampleCard(i as Ord), note, template)
				if (body.tag === 'Error' || body.ok == null) return null
				return i as Ord
			})
			.filter(notEmpty)
		return distinctAndOrder(ords)
	} else if (template.templateType.tag === 'cloze') {
		const ords = objEntries(note.fieldValues).flatMap(([, value]) =>
			Array.from(value.matchAll(clozeRegex)).map((x) => {
				const clozeIndex =
					x.groups?.clozeIndex ??
					throwExp('This error should never occur - is `clozeRegex` broken?')
				return (parseInt(clozeIndex) - 1) as Ord
			}),
		)
		return distinctAndOrder(ords)
	}
	assertNever(template.templateType)
}

function distinctAndOrder(ords: Ord[]) {
	return Array.from(new Set(ords).values()).sort((a, b) => a - b)
}
