import { convert } from './language/template2html.js'
import type { RenderContainer } from './renderContainer.js'
import {
	type NoteId,
	type TemplateId,
	type Ord,
	type NookId,
	type RemoteNoteId,
	type CardId,
	type CardSettingId,
	type Cloze,
	type Standard,
	type Field,
	type Template,
	type Card,
	type Note,
	assertNever,
	notEmpty,
	throwExp,
	toOneLine,
} from 'shared'

export type StandardTemplate = Omit<Template, 'templateType'> & {
	templateType: Standard
}

export type ClozeTemplate = Omit<Template, 'templateType'> & {
	templateType: Cloze
}

export const strip = toOneLine

// These have hidden state - don't use `match` or `exec`!
// https://www.tsmean.com/articles/regex/javascript-regex-match-vs-exec-vs-matchall/
export const clozeRegex =
	/{{c(?<clozeIndex>\d+)::(?<answer>.*?)(?:::(?<hint>.*?))?}}/gi
export const clozeTemplateRegex = /{{cloze:(?<fieldName>.+?)}}/gi

// https://stackoverflow.com/a/6969486
export function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function body(
	this: RenderContainer,
	card: Card,
	note: Note,
	template: Template,
	short: boolean = false,
): readonly [string, string] | null {
	let { front, back, shortFront, shortBack } =
		template.templateType.tag === 'standard'
			? template.templateType.templates.find((t) => t.id === card.ord) ??
			  throwExp(`Ord ${card.ord} not found`)
			: template.templateType.template
	if (short) {
		front = shortFront == null || shortFront.trim() === '' ? front : shortFront
		back = shortBack == null || shortBack.trim() === '' ? back : shortBack
	}
	function replaceFields(
		this: RenderContainer,
		isFront: boolean,
		seed: string,
	) {
		return convert.bind(this)(seed, isFront, card, note, template)
	}
	const frontSide = replaceFields.call(this, true, front)
	if (frontSide === front || frontSide === '') {
		return null
	} else {
		const backSide = replaceFields
			.call(this, false, back)
			.replace('{{FrontSide}}', replaceFields.call(this, false, front))
		if (short) return [this.strip(frontSide), this.strip(backSide)] as const
		return [frontSide, backSide] as const
	}
}
export interface ReplacerArgs {
	initialValue: string
	isFront: boolean
	card: Card
	note: Note
	template: Template
}

export type Replacers = Map<string, Replacer>

export type Replacer = (this: RenderContainer, args: ReplacerArgs) => string

export const replacers: Map<string, Replacer> = new Map<string, Replacer>([
	['text', stripHtmlReplacer],
	['cloze', clozeReplacer],
])

function getClozeFields(
	this: RenderContainer,
	frontTemplate: string,
): string[] {
	return Array.from(
		frontTemplate.matchAll(this.clozeTemplateRegex),
		(x) =>
			x.groups?.fieldName ??
			throwExp(
				'This error should never occur - is `clozeTemplateRegex` broken?',
			),
	)
}

function stripHtmlReplacer(
	this: RenderContainer,
	{ initialValue }: ReplacerArgs,
) {
	return this.strip(initialValue)
}

function clozeReplacer(
	this: RenderContainer,
	{ initialValue, isFront, card, note, template }: ReplacerArgs,
) {
	let r = initialValue
	if (template.templateType.tag === 'cloze') {
		const i = (card.ord.valueOf() + 1).toString()
		const indexMatch = Array.from(
			r.matchAll(this.clozeRegex),
			(x) =>
				x.groups?.clozeIndex ??
				throwExp('This error should never occur - is `clozeRegex` broken?'),
		).includes(i)
		if (!indexMatch) {
			r = ''
		} else {
			r = Array.from(r.matchAll(this.clozeRegex))
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
				Array.from(r.matchAll(this.clozeRegex), (x) => [x.groups?.hint, x[0]])
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
				this.clozeRegex,
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
		id: 'SampleNoteId' as NoteId,
		templateId: 'SampleTemplateId' as TemplateId,
		created: new Date(),
		updated: new Date(),
		tags: new Set(['SampleTag']),
		fieldValues,
		remotes: new Map([
			[
				'SampleNookId' as NookId,
				{
					remoteNoteId: 'SampleRemoteNoteId' as RemoteNoteId,
					uploadDate: new Date(),
				},
			],
		]),
	}
}

export function toSampleCard(ord: Ord): Card {
	return {
		id: 'SampleCardId' as CardId,
		ord,
		noteId: 'SampleNoteId' as NoteId,
		tags: new Set(['SampleCardTag']),
		created: new Date(),
		updated: new Date(),
		cardSettingId: 'SampleCardSettingId' as CardSettingId,
		due: new Date(),
	}
}

const getStandardFieldAndValue = (field: Field) =>
	[field.name, `(${field.name})`] as const

export function renderTemplate(
	this: RenderContainer,
	template: Template,
	short: boolean = false,
): ReadonlyArray<readonly [string, string] | null> {
	const fieldsAndValues = new Map(template.fields.map(getStandardFieldAndValue)) // medTODO consider adding escape characters so you can do e.g. {{Front}}. Apparently Anki doesn't have escape characters - now would be a good time to introduce this feature.
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
					toSampleNote(new Map(getFieldsAndValues(clozeField, i))),
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
				if (body == null) return null
				return i as Ord
			})
			.filter(notEmpty)
		return distinctAndOrder(ords)
	} else if (template.templateType.tag === 'cloze') {
		const ords = Array.from(note.fieldValues.entries()).flatMap(([, value]) =>
			Array.from(value.matchAll(this.clozeRegex)).map((x) => {
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
