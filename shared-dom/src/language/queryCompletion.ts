import {
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import {
	Group,
	Program,
	QuotedString,
	SimpleString,
	Label,
} from './queryParser.terms'
import { escapedQuoted, getLabel, stringLabels } from './query2sql'
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
	getHistory: () => Set<string>
}) => CompletionSource =
	({ getTags, getHistory }) =>
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
		} else if (inLabel(nodeBefore, 'tag')) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const tagBefore = /\w*$/.exec(textBefore)
			if (tagBefore == null && !context.explicit) return null
			const tags = await getTags()
			return {
				from:
					tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos,
				options: tags.map((tag) => {
					const escaped = escapedQuoted(tag)
					return {
						label: tag,
						type: 'tag',
						apply: nodeBefore.type.is(QuotedString)
							? escaped
							: '"' + escaped + '"',
					} satisfies Completion
				}),
				validFor: /^(\w*)?$/,
			}
		}
		return null
	}

function inLabel(nodeBefore: SyntaxNode, label: string) {
	return (
		(nodeBefore.type.is(Label) && getLabel(nodeBefore) === label) ||
		(nodeBefore.parent?.type.is(Label) === true &&
			getLabel(nodeBefore.parent) === label)
	)
}
