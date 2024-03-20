import { syntaxTree } from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'

// https://discuss.codemirror.net/t/showing-syntax-errors/3111/6
export const queryLinter = linter(({ state }) => {
	const diagnostics: Diagnostic[] = []
	syntaxTree(state).iterate({
		enter: ({ type, from, to }) => {
			if (type.isError) {
				diagnostics.push({
					from,
					to,
					severity: 'error',
					message: 'Syntax error.', //  Yes this is a terrible error message, maybe we'll make it better someday
				})
			}
		},
	})
	return diagnostics
})
