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
	SimpleString,
	Label,
	Regex,
	RawQuoted,
} from './queryParser.terms'
import { escapedQuoted1, escapedQuoted2, getLabel } from './query2sql'
import {
	kind,
	kindEnums,
	setting,
	stringLabels,
	tag,
	template,
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

export const queryCompletion: (_: {
	getTags: () => Promise<string[]>
	getTemplates: () => Promise<string[]>
	getCardSettings: () => Promise<string[]>
	getHistory: () => Set<string>
}) => CompletionSource =
	({ getTags, getHistory, getTemplates, getCardSettings }) =>
	async (context) => {
		if (context.explicit && context.pos === 0) {
			return {
				from: 0,
				options: buildHistoryCompletion(Array.from(getHistory())).reverse(),
				filter: false,
			}
		}
		const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
		const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
		const tagBefore = simpleStringRegex.exec(textBefore)
		if (tagBefore == null && !context.explicit) return null
		const from =
			tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos
		if (
			nodeBefore.type.is(Program) ||
			(nodeBefore.type.is(SimpleString) &&
				(nodeBefore.parent?.type.is(Group) === true ||
					nodeBefore.parent?.type.is(Program) === true))
		) {
			const options: Completion[] = stringLabels.map(
				(option) =>
					({
						label: option,
						type: 'general',
						apply: option + ':',
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
				validFor: (x) => history.some((h) => h.startsWith(x)),
			}
		} else if (inLabel(nodeBefore, tag)) {
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
		} else if (inLabel(nodeBefore, kind)) {
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
		}
		return null
	}

function inLabel(nodeBefore: SyntaxNode, label: string) {
	if (nodeBefore.type.is(Regex)) return false
	return (
		(nodeBefore.type.is(Label) && getLabel(nodeBefore) === label) ||
		(nodeBefore.parent?.type.is(Label) === true &&
			getLabel(nodeBefore.parent) === label)
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

// based on 569040F1-5B10-4D97-8F7B-0D75D81E7688
const simpleStringRegex =
	// eslint-disable-next-line no-control-regex
	/[^%#^=<>`\\/*_,():'"\u0009\u000A\u000B\u000C\u000D\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000]*$/
