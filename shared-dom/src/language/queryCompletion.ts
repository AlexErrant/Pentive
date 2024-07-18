import {
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import {
	Group,
	Program,
	Quoted1,
	Quoted2,
	Label,
	Regex,
	RawQuoted,
	Comparison,
	Date as qtDate,
	reviewed as qtReviewed,
	firstReviewed as qtFirstReviewed,
	Number as qtNumber,
} from './queryParser.terms'
import { escapedQuoted1, escapedQuoted2, getLabel } from './query2sql'
import {
	isDateValuedLabel,
	isNumberValuedLabel,
	dateValuedLabels,
	numberValuedLabels,
	due,
	field,
	kind,
	kindEnums,
	setting,
	stringLabels,
	tag,
	template,
	reviewed,
	firstReviewed,
} from './stringLabels'
import { type SyntaxNode } from '@lezer/common'

// I don't think we should use Codemirror's autocomplete for showing history. Doing anything more
// advanced, e.g. deleting an entry from history, is unsupported in `@codemirror/autocomplete`.
// In particular, while we can detect a pressing of the `Delete` key, there's no `Command` like
// `startCompletion` in `@codemirror/autocomplete` for removing a completion.
// lowTODO investigate using `@thisbeyond/solid-select` instead. Or fork `@codemirror/autocomplete` >_<
//
// https://discuss.codemirror.net/t/how-to-add-new-auto-complete-values-to-existing-auto-completion-results-dynamically/6750/2
// ^ this indicates that the completions can't be live updated
function buildHistoryCompletion(history: string[]) {
	return history.map(
		(label) =>
			({
				label,
				type: 'history',
			}) satisfies Completion,
	)
}

export const queryCompletion: (
	_: {
		getTags: () => Promise<string[]>
		getTemplates: () => Promise<string[]>
		getCardSettings: () => Promise<string[]>
		getFields: () => Promise<string[]>
		getHistory: () => Set<string>
		getDate: () => Date
	},
	isSimpleString?: true,
) => CompletionSource =
	(
		{ getTags, getHistory, getTemplates, getCardSettings, getFields, getDate },
		isSimpleString,
	) =>
	async (context) => {
		let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
		const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
		const tagBefore = simpleStringRegex.exec(textBefore)
		if (tagBefore == null && !context.explicit) return null
		const from =
			tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos
		if (isSimpleString) {
			// set `nodeBefore` to the "SimpleString" node
			while (!nodeBefore.type.isTop && nodeBefore.parent != null) {
				nodeBefore = nodeBefore.parent
			}
		}
		if (inLabel(nodeBefore, tag)) {
			const tags = await getTags()
			return {
				from,
				options: tags.map(
					(tag) =>
						({
							label: tag,
							type: 'tag',
							apply: buildApply(nodeBefore, tag),
						}) satisfies Completion,
				),
				validFor: simpleStringRegex,
			}
		} else if (inLabel(nodeBefore, setting)) {
			const cardSettings = await getCardSettings()
			return {
				from,
				options: cardSettings.map(
					(cardSetting) =>
						({
							label: cardSetting,
							type: 'general',
							apply: buildApply(nodeBefore, cardSetting),
						}) satisfies Completion,
				),
				validFor: simpleStringRegex,
			}
		} else if (
			inLabel(nodeBefore, field) &&
			(nodeBefore.prevSibling?.name === field ||
				nodeBefore.parent?.prevSibling?.prevSibling?.name === field)
		) {
			const fields = await getFields()
			return {
				from,
				options: fields.map(
					(field) =>
						({
							label: field,
							type: 'general',
							apply: buildApply(nodeBefore, field) + ':',
						}) satisfies Completion,
				),
				validFor: simpleStringRegex,
			}
		} else if (inLabel(nodeBefore, kind, isSimpleString)) {
			return {
				from,
				options: kindEnums.map(
					(kind) =>
						({
							label: kind,
							type: 'general',
						}) satisfies Completion,
				),
				validFor: simpleStringRegex,
			}
		} else if (isSimpleString && isDateValuedLabel(textBefore)) {
			return {
				from: from + textBefore.length,
				options: [
					{
						label: '<=',
						detail: '(before, inclusive)',
					},
					{
						label: '>=',
						detail: '(after, inclusive)',
					},
					{
						label: '<',
						detail: '(before)',
					},
					{
						label: '>',
						detail: '(after)',
					},
					{
						label: '=',
						detail: '(on)',
					},
				],
			}
		} else if (isSimpleString && isNumberValuedLabel(textBefore)) {
			return {
				from: from + textBefore.length,
				options: [
					{
						label: '<=',
					},
					{
						label: '>=',
					},
					{
						label: '<',
					},
					{
						label: '>',
					},
					{
						label: '=',
					},
				],
			}
		} else if (inLabels(nodeBefore, numberValuedLabels)) {
			return {
				from,
				options: [
					{
						label: '0',
					},
					{
						label: '1',
					},
					{
						label: '2',
						info: 'Also, type in any number.',
					},
				],
			}
		} else if (
			// see comment below
			inLabel(nodeBefore, reviewed) ||
			inLabel(nodeBefore, firstReviewed)
		) {
			if (nodeBefore.type.is(Comparison)) {
				if (
					nodeBefore.prevSibling?.type.is(qtReviewed) === true ||
					nodeBefore.prevSibling?.type.is(qtFirstReviewed) === true
				) {
					const datesCompletion = buildDates(getDate(), from)
					for (const option of datesCompletion.options) {
						option.type = 'uglyhack' // grep 3D3FADF2-7338-49F8-9CAF-9CBC2E9C5137 We use this to tell `activateOnCompletion` that there's another autocomplete available
					}
					return datesCompletion
				} else {
					return {
						from,
						options: [
							{
								label: 'again',
								detail: '(1)',
							},
							{
								label: 'hard',
								detail: '(2)',
							},
							{
								label: 'good',
								detail: '(3)',
							},
							{
								label: 'easy',
								detail: '(4)',
							},
						],
					}
				}
			} else if (nodeBefore.type.is(qtDate) || nodeBefore.type.is(qtNumber)) {
				return {
					from: from + textBefore.length,
					options: [
						{
							label: '<=',
							detail: '(harder than, inclusive)',
						},
						{
							label: '>=',
							detail: '(easier than, inclusive)',
						},
						{
							label: '<',
							detail: '(harder than)',
						},
						{
							label: '>',
							detail: '(easier than)',
						},
						{
							label: '=',
						},
						{
							label: 'The above are optional',
							apply: ' ',
						},
					],
				}
			}
		} else if (
			// see comment below
			inLabel(nodeBefore, due)
		) {
			return buildDates(getDate(), from, textBefore)
		} else if (
			// note that `inLabel(nodeBefore, due)` and `inLabel(nodeBefore, reviewed) || inLabel(nodeBefore, firstReviewed)`
			// must precede this branch since `dateValuedLabels` includes `due`, `reviewed`, and `firstReviewed`
			inLabels(nodeBefore, dateValuedLabels)
		) {
			return buildDates(getDate(), from)
		} else if (inLabel(nodeBefore, template)) {
			const templates = await getTemplates()
			return {
				from,
				options: templates.map(
					(template) =>
						({
							label: template,
							type: 'general',
							apply: buildApply(nodeBefore, template),
						}) satisfies Completion,
				),
				validFor: simpleStringRegex,
			}
		} else if (
			nodeBefore.type.is(Program) ||
			nodeBefore.type.is(Group) ||
			(isSimpleString &&
				(nodeBefore.parent?.type.is(Group) === true ||
					nodeBefore.parent?.type.is(Program) === true))
		) {
			const options: Completion[] = stringLabels.map(
				(option) =>
					({
						label: option,
						type: 'general',
						apply:
							option +
							(isDateValuedLabel(option) || isNumberValuedLabel(option)
								? ''
								: ':'),
					}) satisfies Completion,
			)
			// only use historical autocomplete if we're replacing everything
			const history = Array.from(getHistory())
			if (from === 0) {
				options.push(...buildHistoryCompletion(history))
			}
			return {
				from,
				options,
				validFor: (s) => {
					if (isDateValuedLabel(s) || isNumberValuedLabel(s)) return false
					return history.some((h) => h.startsWith(s))
				},
			}
		}
		return null
	}

function inLabel(
	nodeBefore: SyntaxNode,
	label: string,
	isSimpleString?: true, // not all callers need to provide this - just the ones where incomplete enums yield error nodes, e.g. "kind:re"
) {
	if (nodeBefore.type.is(Regex)) return false
	return (
		(nodeBefore.type.is(Label) && getLabel(nodeBefore) === label) ||
		(nodeBefore.parent?.type.is(Label) === true &&
			getLabel(nodeBefore.parent) === label) ||
		(nodeBefore.parent?.parent?.type.is(Label) === true &&
			getLabel(nodeBefore.parent.parent) === label) ||
		(isSimpleString === true &&
			nodeBefore.prevSibling?.type.is(Label) === true &&
			getLabel(nodeBefore.prevSibling) === label &&
			nodeBefore.prevSibling.lastChild?.node.type.isError === true)
	)
}
export function inLabels(
	nodeBefore: SyntaxNode,
	labels: Array<string | undefined>,
) {
	if (nodeBefore.type.is(Regex)) return false
	return (
		nodeBefore.parent?.type.is(Label) === true &&
		labels.includes(getLabel(nodeBefore.parent))
	)
}

function buildApply(nodeBefore: SyntaxNode, option: string) {
	return nodeBefore.type.is(Quoted1)
		? escapedQuoted1(option)
		: nodeBefore.type.is(Quoted2)
		? escapedQuoted2(option)
		: nodeBefore.type.is(RawQuoted)
		? option
		: '"' + escapedQuoted2(option) + '"'
}

function buildDates(now: Date, from: number, textBefore?: string) {
	// https://stackoverflow.com/a/50130338
	const offset = now.getTimezoneOffset() * 60000
	const today = new Date(now.getTime() - offset).toISOString().split('T')[0]!
	// https://stackoverflow.com/a/5511376
	now.setDate(now.getDate() - 1) // mutates `now`
	const yesterday = new Date(now.getTime() - offset)
		.toISOString()
		.split('T')[0]!
	now.setDate(now.getDate() - 6) // mutates `now`
	const week = new Date(now.getTime() - offset).toISOString().split('T')[0]!
	const dueCompletion: Completion[] =
		textBefore != null
			? [
					...(textBefore === '='
						? [
								{
									label: 'true',
									detail: '(is due)',
									boost: 5,
								},
								{
									label: 'false',
									detail: '(is not due)',
									boost: 4,
								},
						  ]
						: []),
					{
						label: '-1',
						detail: '(days ago - Tomorrow)',
					},
			  ]
			: []
	return {
		from,
		options: [
			...dueCompletion,
			{
				label: today,
				detail: '(Today)',
				boost: 3,
			},
			{
				label: yesterday,
				detail: '(Yesterday)',
				boost: 2,
			},
			{
				label: week,
				detail: '(1 week ago)',
				boost: 1,
				info: 'Also, type in any date (YYYY-MM-DD).',
			},
			{
				label: '0',
				detail: '(days ago - Today)',
			},
			{
				label: '1',
				detail: '(day ago - Yesterday)',
			},
			{
				label: '7',
				detail: '(days ago)',
				info: 'Also, type in any number to get that many days ago.',
			},
		] satisfies Completion[],
		validFor: simpleStringRegex,
	}
}

// based on 569040F1-5B10-4D97-8F7B-0D75D81E7688
const simpleStringRegex =
	// eslint-disable-next-line no-control-regex
	/[^%#^=<>`/,():'"\u0009\u000A\u000B\u000C\u000D\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]*$/
