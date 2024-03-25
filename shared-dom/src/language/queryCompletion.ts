import { type CompletionSource } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import { Group, Program, SimpleString } from './queryParser.terms'

export const queryCompletion: CompletionSource = (context) => {
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
			from: tagBefore != null ? nodeBefore.from + tagBefore.index : context.pos,
			options: ['deck', 'tag', 'template'].map((option) => ({
				label: option,
				type: 'class', // adds circle icon https://github.com/codemirror/autocomplete/blob/5ad2ebc861f2f61cdc943fc087a5bfb756a7d0fa/src/theme.ts#L110
				apply: option + ':',
			})),
			validFor: /^(\w*)?$/,
		}
	}
	return null
}
