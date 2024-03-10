import { syntaxTree } from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'
import { type Extension } from '@codemirror/state'
import { MismatchedCloseTag } from './templateParser.terms'

// maybe someday we'll add an html linter too

// https://discuss.codemirror.net/t/showing-syntax-errors/3111/6
export function templateLinter(): Extension {
	return linter(({ state }) => {
		const diagnostics: Diagnostic[] = []
		syntaxTree(state).iterate({
			enter: ({ node, type, from, to }) => {
				if (type.isError) {
					if (node.prevSibling?.type.is(MismatchedCloseTag) === true) {
						diagnostics.push({
							from,
							to,
							severity: 'error',
							message: 'Syntax error: Mismatched close tag.',
						})
					} else {
						diagnostics.push({
							from,
							to,
							severity: 'error',
							message: 'Syntax error.', //  Yes this is a terrible error message, maybe we'll make it better someday
						})
					}
				}
			},
		})
		return diagnostics
	})
}
