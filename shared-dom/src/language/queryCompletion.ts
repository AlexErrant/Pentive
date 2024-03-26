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
	Tag,
} from './queryParser.terms'

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
			const options: Completion[] = ['deck', 'tag', 'template'].map(
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
		} else if (
			nodeBefore.type.is(Tag) ||
			nodeBefore.parent?.type.is(Tag) === true
		) {
			const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
			const tagBefore = /\w*$/.exec(textBefore)
			if (tagBefore == null && !context.explicit) return null
			const tags = await getTags()
			return {
				from:
					tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos,
				options: tags.map((tag) => {
					const escaped = tag.replaceAll('\\', '\\\\').replaceAll('"', '\\"') // the order here is important
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
