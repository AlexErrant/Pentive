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

export const queryCompletion: (_: {
	getTags: () => Promise<string[]>
}) => CompletionSource =
	({ getTags }) =>
	async (context) => {
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
			return {
				from:
					tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos,
				options: ['deck', 'tag', 'template'].map(
					(option) =>
						({
							label: option,
							type: 'class', // adds circle icon https://github.com/codemirror/autocomplete/blob/5ad2ebc861f2f61cdc943fc087a5bfb756a7d0fa/src/theme.ts#L110
							apply: option + ':',
						}) satisfies Completion,
				),
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
						type: 'class', // adds circle icon https://github.com/codemirror/autocomplete/blob/5ad2ebc861f2f61cdc943fc087a5bfb756a7d0fa/src/theme.ts#L110
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
