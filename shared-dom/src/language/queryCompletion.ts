import {
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import {
	Group,
	Program,
	QuotedString1,
	QuotedString2,
	SimpleString,
	Label,
	Regex,
	RawStringLiteral,
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
function buildHistory(getHistory: () => Set<string>) {
	return Array.from(getHistory()).map(
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
				options: buildHistory(getHistory).reverse(),
				filter: false,
			}
		}
		const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
		if (
			nodeBefore.type.is(Program) ||
			(nodeBefore.type.is(SimpleString) &&
				(nodeBefore.parent?.type.is(Group) === true ||
					nodeBefore.parent?.type.is(Program) === true))
		) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const tagBefore = /\w*$/.exec(textBefore)
			if (tagBefore == null && !context.explicit) return null
			const from =
				tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos
			const options: Completion[] = stringLabels.map(
				(option) =>
					({
						label: option,
						type: 'general',
						apply: option + ':',
					}) satisfies Completion,
			)
			// only use historical autocomplete if we're replacing everything
			if (from === 0) {
				options.push(...buildHistory(getHistory))
			}
			return {
				from,
				options,
				validFor: /^(\w*)?$/,
			}
		} else if (inLabel(nodeBefore, tag)) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const tagBefore = /\w*$/.exec(textBefore)
			if (tagBefore == null && !context.explicit) return null
			const tags = await getTags()
			return {
				from:
					tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos,
				options: tags.map(
					(tag) =>
						({
							label: tag,
							type: 'tag',
							apply: buildApply(nodeBefore, tag),
						}) satisfies Completion,
				),
				validFor: /^(\w*)?$/,
			}
		} else if (inLabel(nodeBefore, setting)) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const cardSettingBefore = /\w*$/.exec(textBefore)
			if (cardSettingBefore == null && !context.explicit) return null
			const cardSettings = await getCardSettings()
			return {
				from:
					cardSettingBefore != null
						? nodeBefore.from + cardSettingBefore.index
						: context.pos,
				options: cardSettings.map(
					(cardSetting) =>
						({
							label: cardSetting,
							type: 'general',
							apply: buildApply(nodeBefore, cardSetting),
						}) satisfies Completion,
				),
				validFor: /^(\w*)?$/,
			}
		} else if (inLabel(nodeBefore, kind)) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const kindBefore = /\w*$/.exec(textBefore)
			if (kindBefore == null && !context.explicit) return null
			return {
				from:
					kindBefore != null ? nodeBefore.from + kindBefore.index : context.pos,
				options: kindEnums.map(
					(kind) =>
						({
							label: kind,
							type: 'general',
						}) satisfies Completion,
				),
				validFor: /^(\w*)?$/,
			}
		} else if (inLabel(nodeBefore, template)) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const templateBefore = /\w*$/.exec(textBefore)
			if (templateBefore == null && !context.explicit) return null
			const templates = await getTemplates()
			return {
				from:
					templateBefore != null
						? nodeBefore.from + templateBefore.index
						: context.pos,
				options: templates.map(
					(template) =>
						({
							label: template,
							type: 'general',
							apply: buildApply(nodeBefore, template),
						}) satisfies Completion,
				),
				validFor: /^(\w*)?$/,
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
	return nodeBefore.type.is(QuotedString1)
		? escapedQuoted1(option)
		: nodeBefore.type.is(QuotedString2)
		? escapedQuoted2(option)
		: nodeBefore.type.is(RawStringLiteral)
		? option
		: '"' + escapedQuoted2(option) + '"'
}
