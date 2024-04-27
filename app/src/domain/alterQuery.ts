import { escapedQuoted2, queryParser, queryTerms } from 'shared-dom'

// https://stackoverflow.com/a/21350614
function spliceSlice(
	str: string,
	start: number,
	deleteCount: number,
	add: string,
) {
	// We cannot pass negative indexes directly to the 2nd slicing operation.
	if (start < 0) {
		start = str.length + start
		if (start < 0) {
			start = 0
		}
	}
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	return str.slice(0, start) + (add || '') + str.slice(start + deleteCount)
}

function getToAdd(tags: string[] | null) {
	return tags === null || tags.length === 0
		? ''
		: '(tag:' + tags.map((t) => '"' + escapedQuoted2(t) + '"').join(',') + ')'
}

export function alterQuery(query: string, input: { tags?: string[] }) {
	let q = query
	const tree = queryParser.parse(q)
	let handledTags = false
	tree.cursor().iterate((node) => {
		if (node.node.parent?.type.is(queryTerms.Program) === true) {
			if (
				node.type.is(queryTerms.Label) &&
				node.node.firstChild?.node.type.is(queryTerms.tag) === true &&
				input.tags != null
			) {
				q = spliceSlice(q, node.from, node.to - node.from, getToAdd(input.tags))
				handledTags = true
			}
			return false
		}
	})
	if (!handledTags && input.tags != null) {
		const toAdd = getToAdd(input.tags)
		if (q.trim().length === 0) {
			q = toAdd
		} else if (q.slice(-1) === ' ') {
			q = q + toAdd
		} else {
			q = q + ' ' + toAdd
		}
	}
	return q
}
