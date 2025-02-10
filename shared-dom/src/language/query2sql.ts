import type { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever, dayInMs, escapeRegExp, throwExp } from 'shared/utility'
import { sql, type RawBuilder, type SqlBool } from 'kysely'
import { ftsNormalize } from 'shared/htmlToText'
import * as qt from './queryParser.terms'
import {
	stringLabels,
	labels,
	tag,
	template,
	templateId,
	cardId,
	noteId,
	setting,
	settingId,
	kind,
	state,
	reviewed,
	firstReviewed,
	tagCount,
	cardTagCount,
	noteTagCount,
	created,
	noteCreated,
	cardCreated,
	edited,
	noteEdited,
	cardEdited,
	due,
	lapses,
	reps,
	type ratingEnums,
	field,
	serializeKind,
	type KindEnum,
	serializeState,
	type StateEnum,
} from './stringLabels'

type JoinTable = Array<{
	sql: RawBuilder<SqlBool>
	name: string
}>

class Context {
	constructor(now: Date) {
		this.now = now
		this.sql = []
		this.root = new Group(null, false)
		this.current = this.root
		this.joinCardTag = []
		this.joinNoteTag = []
		this.cardTagCount = false
		this.noteTagCount = false
		this.joinCardTagsFts = []
		this.joinNoteTagsFts = []
		this.joinNoteValueFts = []
		this.joinNoteFieldValue = []
		this.joinTemplateNameFts = false
		this.joinCardSettingNameFts = false
		this.joinLatestReview = false
		this.joinReview = false
		this.joinFirstReview = false
		this.fieldValueHighlight = []
		this.joinTableName = 0
	}

	sql: Array<string | RawBuilder<unknown>>
	root: Group
	current: Group
	joinCardTag: JoinTable
	joinNoteTag: JoinTable
	cardTagCount: boolean
	noteTagCount: boolean
	joinCardTagsFts: JoinTable
	joinNoteTagsFts: JoinTable
	joinNoteValueFts: JoinTable
	joinNoteFieldValue: JoinTable
	joinTemplateNameFts: boolean
	joinCardSettingNameFts: boolean
	joinLatestReview: boolean
	joinReview: boolean
	joinFirstReview: boolean
	fieldValueHighlight: FieldValueHighlight[]
	joinTableName: number
	now: Date

	trustedSql(trustedSql: string) {
		this.sql.push(sql.raw(` ${trustedSql} `))
	}

	parameterizeSql(parameter: RawBuilder<unknown>) {
		this.sql.push(parameter)
	}

	like(
		qs: QueryString,
		table: Table,
		sourceColumn: string,
		forcePositive?: true,
	) {
		this.sql.push(glob(qs, table, sourceColumn, forcePositive))
	}

	regexpWithFlags(node: QueryRegex, column: string) {
		this.sql.push(regexpWithFlags(node, column))
	}
}

export interface FieldValueHighlight {
	pattern: string
	flags: string
	boundLeft: boolean
	boundRight: boolean
}

export function convert(input: string, now: Date) {
	const tree = parser.parse(input)
	const context = new Context(now)
	tree.cursor().iterate(
		(node) => astEnter(input, node, context),
		(node) => {
			astLeave(input, node, context)
		},
	)
	serialize(context.root, context)
	return {
		sql:
			context.sql.length === 0
				? null
				: (sql.join(context.sql, sql``) as RawBuilder<SqlBool>),
		joinCardTag: context.joinCardTag,
		joinNoteTag: context.joinNoteTag,
		cardTagCount: context.cardTagCount,
		noteTagCount: context.noteTagCount,
		joinCardTagFts: context.joinCardTagsFts,
		joinNoteTagFts: context.joinNoteTagsFts,
		joinNoteValueFts: context.joinNoteValueFts,
		joinNoteFieldValue: context.joinNoteFieldValue,
		joinCardSettingNameFts: context.joinCardSettingNameFts,
		joinTemplateNameFts: context.joinTemplateNameFts,
		joinLatestReview: context.joinLatestReview,
		joinReview: context.joinReview,
		joinFirstReview: context.joinFirstReview,
		fieldValueHighlight: context.fieldValueHighlight,
	}
}

// https://stackoverflow.com/a/28798479
export function unique(str: string) {
	return Array.from(str)
		.filter((item, i, ar) => ar.indexOf(item) === i)
		.join('')
}

export function getLabel(node: SyntaxNodeRef) {
	if (node.type.is(qt.Group) || node.type.isTop) return undefined
	if (!node.type.is(qt.Label)) node = node.node.parent! // "if not label, set node to its parent". Note that we reassign `node`.
	let child = node.node.firstChild
	while (child != null && !stringLabels.includes(child.type.name)) {
		child = child.nextSibling
	}
	const label = child?.name
	console.assert(
		labels.includes(label as never),
		`Expected Label but got ${label}.`,
	)
	return label as Label
}

function buildContent(node: SyntaxNodeRef, input: string, negate: boolean) {
	let valueFrom
	let valueTo
	const regex: string[] = []
	if (node.node.firstChild == null) throwExp()
	let child = node.node.firstChild.nextSibling
	let close = null
	while (child != null) {
		if (
			child.type.id === qt.Content_1 ||
			child.type.id === qt.Content_2 ||
			child.type.id === qt.Content_3 ||
			child.type.id === qt.RawQuoted1Content ||
			child.type.id === qt.RawQuoted2Content ||
			child.type.id === qt.RawHtmlContent
		) {
			const value = input.slice(child.from, child.to)
			regex.push(escapeRegExp(value))
			valueFrom ??= child.from
			valueTo = child.to
		} else if (
			child.type.id === qt.Squared_1 ||
			child.type.id === qt.Squared_2 ||
			child.type.id === qt.Squared_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push(input.slice(child.from, child.to))
		} else if (
			child.type.id === qt.Wildcard_1 ||
			child.type.id === qt.Wildcard_2 ||
			child.type.id === qt.Wildcard_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push('.*')
		} else if (
			child.type.id === qt.Wildcard1_1 ||
			child.type.id === qt.Wildcard1_2 ||
			child.type.id === qt.Wildcard1_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push('.')
		} else if (
			child.type.id === qt.Quoted1Close ||
			child.type.id === qt.Quoted2Close ||
			child.type.id === qt.RawQuoted1Close ||
			child.type.id === qt.RawQuoted2Close ||
			child.type.id === qt.HtmlClose ||
			child.type.id === qt.RawHtmlClose
		) {
			close = input.slice(child.from, child.to)
			break
		}
		child = child.nextSibling
	}
	const open = input.slice(node.node.firstChild.from, node.node.firstChild.to)
	const wildcardLeft = !open.includes('##')
	const wildcardRight = close == null ? true : !close.includes('##')
	const boundLeft = wildcardLeft && open.includes('#')
	const boundRight =
		close == null ? false : wildcardRight && close.includes('#')
	const pattern = regex.join('')
	const caseSensitive = open.includes('^') || close?.includes('^') === true
	const removeCombiningCharacters =
		open.includes('%') || close?.includes('%') === true
	return {
		value: input.slice(valueFrom, valueTo),
		wildcardLeft,
		wildcardRight,
		boundLeft,
		boundRight,
		removeCombiningCharacters,
		caseSensitive,
		fieldValueHighlight: negate
			? undefined // if negate, don't highlight, since it won't be in the search
			: {
					pattern,
					flags: caseSensitive ? 'v' : 'vi', // regex flag 31C731B0-41F5-46A5-93B4-D00D9A6064EA
					boundRight,
					boundLeft,
				},
	} satisfies Content
}

interface Content {
	value: string
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
	removeCombiningCharacters: boolean
	caseSensitive: boolean
	fieldValueHighlight?: FieldValueHighlight
}

// we cache the field because the next run of astEnter should be on the field's value, and we need the field
let fieldCache: QueryString | QueryRegex | undefined
function attachQuery(
	node: SyntaxNodeRef,
	label: Label | undefined,
	context: Context,
	queryOrField: QueryString | QueryRegex,
) {
	if (label === field) {
		if (node.node.parent?.type.is(qt.FieldName) === true) {
			fieldCache = queryOrField
		} else {
			console.assert(fieldCache, 'query.Field should have a value!')
			queryOrField.field = fieldCache
			context.current.attach(queryOrField)
			fieldCache = undefined
		}
	} else {
		context.current.attach(queryOrField)
	}
}

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (
		node.type.is(qt.SimpleString) ||
		node.type.is(qt.KindEnum) ||
		node.type.is(qt.StateEnum) ||
		node.type.is(qt.DueEnum) ||
		node.type.is(qt.Number) ||
		node.type.is(qt.Date) ||
		node.type.is(qt.Quoted1) ||
		node.type.is(qt.Quoted2) ||
		node.type.is(qt.Html) ||
		node.type.is(qt.RawHtml) ||
		node.type.is(qt.RawQuoted)
	) {
		maybeAddSeparator(node.node, context)
		const label = getLabel(node.node.parent!)
		const negate = isNegated(node.node)
		let comparison
		if (node.type.is(qt.Date) || node.type.is(qt.Number)) {
			let prev = node.node.prevSibling!
			let maybe = input.slice(prev.from, prev.to)
			if (maybe === '-') {
				prev = prev.prevSibling!
				maybe = input.slice(prev.from, prev.to)
			}
			if (comparisons.includes(maybe as never)) {
				comparison = maybe as Comparison
			}
		}
		const {
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			fieldValueHighlight,
			caseSensitive,
			removeCombiningCharacters,
		} =
			node.type.is(qt.SimpleString) ||
			node.type.is(qt.KindEnum) ||
			node.type.is(qt.StateEnum) ||
			node.type.is(qt.DueEnum) ||
			node.type.is(qt.Date) ||
			node.type.is(qt.Number)
				? ({
						value:
							negate && node.type.is(qt.Number)
								? '-' + input.slice(node.from, node.to)
								: input.slice(node.from, node.to),
						wildcardLeft: true,
						wildcardRight: true,
						boundLeft: false,
						boundRight: false,
						caseSensitive: false,
						removeCombiningCharacters: false,
						fieldValueHighlight: {
							pattern: escapeRegExp(input.slice(node.from, node.to)),
							flags: 'vi', // regex flag 31C731B0-41F5-46A5-93B4-D00D9A6064EA
							boundLeft: false,
							boundRight: false,
						},
					} satisfies Content)
				: node.type.is(qt.Quoted1) ||
					  node.type.is(qt.Quoted2) ||
					  node.type.is(qt.Html) ||
					  node.type.is(qt.RawHtml) ||
					  node.type.is(qt.RawQuoted)
					? buildContent(node, input, negate)
					: throwExp()
		attachQuery(node, label, context, {
			type:
				node.type.is(qt.Quoted1) ||
				node.type.is(qt.Quoted2) ||
				node.type.is(qt.RawQuoted)
					? quoted
					: node.type.is(qt.Html) || node.type.is(qt.RawHtml)
						? html
						: node.type.is(qt.Number)
							? number
							: node.type.is(qt.Date)
								? date
								: simpleString,
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			fieldValueHighlight,
			negate,
			label,
			comparison,
			caseSensitive,
			removeCombiningCharacters,
		})
	} else if (node.type.is(qt.Regex)) {
		maybeAddSeparator(node.node, context)
		const tailDelimiterIndex = input.lastIndexOf('/', node.to)
		const pattern = input.slice(node.from + 1, tailDelimiterIndex)
		const flags = unique(input.slice(tailDelimiterIndex + 1, node.to))
		attachQuery(node, getLabel(node.node.parent!), context, {
			type: regex,
			pattern,
			flags,
			negate: isNegated(node.node),
			label: getLabel(node.node.parent!),
			fieldValueHighlight: {
				pattern,
				flags,
				boundLeft: false,
				boundRight: false,
			},
		})
		return false
	} else if (node.type.is(qt.Group) || node.type.is(qt.Label)) {
		maybeAddSeparator(node.node, context)
		let negate = isNegated(node.node)
		const label = getLabel(node)
		if (
			node.type.is(qt.Label) &&
			node.node.firstChild?.type.is(qt.Not) === true
		) {
			negate = !negate
		}
		const group = new Group(context.current, negate, label)
		context.current.attach(group)
		context.current = group
	} else if (
		(context.current.label === reviewed ||
			context.current.label === firstReviewed) &&
		context.current.children.length === 1
	) {
		const maybe = input.slice(node.from, node.to)
		if (comparisons.includes(maybe as never)) {
			const comparison = maybe as Comparison
			if (node.node.nextSibling?.type.is(qt.RatingEnum) === true) {
				const rating = input.slice(
					node.node.nextSibling.from,
					node.node.nextSibling.to,
				) as (typeof ratingEnums)[number]
				const child = context.current.children[0] as QueryString
				switch (rating) {
					case 'again':
						child.rating = 1
						break
					case 'hard':
						child.rating = 2
						break
					case 'good':
						child.rating = 3
						break
					case 'easy':
						child.rating = 4
						break
					default:
						assertNever(rating)
				}
				child.ratingComparison = comparison
			}
		}
	}
}

function isNegated(node: SyntaxNode) {
	let left = node.node.prevSibling
	while (left?.type.isError === true) {
		left = left.prevSibling
	}
	return left?.type.is(qt.Not) === true
}

function astLeave(_input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.is(qt.Group) || node.type.is(qt.Label)) {
		if (!context.current.isRoot) {
			context.current = context.current.parent!
		}
	}
}

type Table =
	| 'cardTagFts'
	| 'noteTagFts'
	| 'cardSettingNameFts'
	| 'templateNameFts'
	| 'noteValueFts'
	| 'noteFieldValue'

function glob(
	qs: QueryString,
	table: Table,
	sourceColumn: string,
	forcePositive?: true,
	stripHtml?: '0',
	normalizedCol?: RawBuilder<unknown>,
) {
	normalizedCol ??= sql.raw(table + '.normalized')
	const left = qs.wildcardLeft ? '*' : ''
	const right = qs.wildcardRight ? '*' : ''
	const normalizedValue = ftsNormalize(qs.value, false, true, false)
	const wildcardedValue = `${left}${normalizedValue}${right}`
	const not = getNot(qs.negate, forcePositive)
	const removeCombiningCharacters = qs.removeCombiningCharacters ? '1' : '0'
	const init = qs.removeCombiningCharacters
		? sql.raw(' (TRUE ') // gotta have something since there may be subsequent ANDs
		: sql`(${normalizedCol} ${not} GLOB ${wildcardedValue}`
	const filterList = [init]
	const sHtml = stripHtml ?? '1'
	const caseFoldBool = qs.caseSensitive ? '0' : '1' // "if caseSensitive, do NOT case fold"
	const customNormalizedCol = sql.raw(
		`ftsNormalize(${table}.${sourceColumn}, ${sHtml}, ${caseFoldBool}, ${removeCombiningCharacters})`,
	)
	let customNormalizedValue
	if (qs.removeCombiningCharacters || qs.caseSensitive) {
		const caseFoldBool = !qs.caseSensitive
		customNormalizedValue = ftsNormalize(
			qs.value,
			false,
			caseFoldBool,
			qs.removeCombiningCharacters,
		)
		const value = `${left}${customNormalizedValue}${right}`
		filterList.push(sql` AND ${customNormalizedCol} ${not} GLOB ${value}`)
	}
	const leftRightBoth = // 0 1 2 correspond to C3B5BEA8-3A89-40CB-971F-6FBA780A6487
		qs.boundLeft && qs.boundRight
			? 1
			: qs.boundLeft
				? 0
				: qs.boundRight
					? 2
					: null
	if (leftRightBoth != null) {
		const lrb = sql.raw(leftRightBoth.toString())
		const wordFilter =
			customNormalizedValue === undefined
				? sql` AND ${not} word(${lrb}, ${normalizedValue}, ${normalizedCol})`
				: sql` AND ${not} word(${lrb}, ${customNormalizedValue}, ${customNormalizedCol})`
		filterList.push(wordFilter)
	}
	filterList.push(sql.raw(`)`))
	return sql.join(filterList, sql``) as RawBuilder<SqlBool>
}

function regexpWithFlags(
	node: QueryRegex,
	column: string,
	forcePositive?: true,
) {
	const col = sql.raw(column)
	const not = getNot(node.negate, forcePositive)
	return sql<SqlBool>`${not} regexp_with_flags(${node.pattern}, ${node.flags}, ${col})`
}

function handleField(
	node: QueryString | QueryRegex,
	valueSql: RawBuilder<SqlBool>,
) {
	if (node.label === field) {
		if (node.field === undefined) throwExp()
		const fieldSql =
			node.field.type === 'Regex'
				? regexpWithFlags(node.field, `noteFieldValue.field`, true)
				: glob(
						node.field,
						`noteFieldValue`,
						`field`,
						true,
						undefined,
						// Running `ftsNormalize` is faster than joining against `noteFieldFts`. IDK why - I blame FTS5/virtual tables having suboptimal query planning.
						// Could try joining against the result set but that could be a very, very large https://sqlite.org/forum/forumpost/5b303ab003f91660
						// At least this way the engine *might* take advantage of the SQLITE_DETERMINISTIC flag https://www.sqlite.org/deterministic.html (though currently it doesn't seem to cache)
						sql.raw('ftsNormalize(noteFieldValue.field, 1, 1, 0)'),
					)
		return sql<SqlBool>`${fieldSql} AND ${valueSql}`
	}
	return valueSql
}

function serialize(node: Node, context: Context) {
	switch (node.type) {
		case simpleString:
		case quoted:
		case html:
		case number:
		case date:
		case regex: {
			const name = getJoinTableName(context)
			if (node.type === 'Regex') {
				context.joinNoteFieldValue.push({
					name,
					sql: handleField(
						node,
						regexpWithFlags(node, `noteFieldValue.value`, true),
					),
				})
			} else if (node.type === 'Html') {
				context.joinNoteValueFts.push({
					name,
					sql: handleField(
						node,
						glob(node, `noteValueFts`, `value`, true, '0'),
					),
				})
			} else {
				context.joinNoteValueFts.push({
					name,
					sql: handleField(node, glob(node, `noteValueFts`, `value`, true)),
				})
			}
			context.trustedSql(`${name}.z IS ${node.negate ? '' : 'NOT'} NULL`) // `z` from 2DB5DD73-603E-4DF7-A366-A53375AF0093
			if (!node.negate && node.fieldValueHighlight != null) {
				context.fieldValueHighlight.push(node.fieldValueHighlight)
			}
			break
		}
		case group: {
			const paren = !node.isRoot
			if (paren) {
				if (node.negate) context.trustedSql('NOT')
				context.trustedSql('(')
			}
			if (node.label == null) {
				for (const child of node.children) {
					serialize(child, context)
				}
			} else {
				for (const child of node.children) {
					switch (child.type) {
						case simpleString:
						case quoted:
						case number:
						case date:
						case html:
						case regex:
							handleLabel(child, context)
							break
						default:
							serialize(child, context)
					}
				}
			}
			if (paren) {
				context.trustedSql(')')
			}
			break
		}
		case and:
			context.trustedSql('AND')
			break
		case or:
			context.trustedSql('OR')
			break
		default:
			assertNever(node)
	}
}

function handleLabel(node: QueryString | QueryRegex, context: Context) {
	switch (node.label) {
		case tag: {
			buildTagSearch(node, context)
			break
		}
		case template: {
			if (node.type === 'Regex') {
				context.regexpWithFlags(node, `template.name`)
			} else {
				context.joinTemplateNameFts = true
				context.like(node, 'templateNameFts', 'name')
			}
			break
		}
		case templateId: {
			if (node.type === 'Regex') throwExp()
			const equals = sql.raw(node.negate ? '!=' : '=')
			context.parameterizeSql(sql`note.templateId ${equals} ${node.value}`)
			break
		}
		case cardId: {
			if (node.type === 'Regex') throwExp()
			const equals = sql.raw(node.negate ? '!=' : '=')
			context.parameterizeSql(sql`card.id ${equals} ${node.value}`)
			break
		}
		case noteId: {
			if (node.type === 'Regex') throwExp()
			const equals = sql.raw(node.negate ? '!=' : '=')
			context.parameterizeSql(sql`note.id ${equals} ${node.value}`)
			break
		}
		case setting: {
			if (node.type === 'Regex') {
				context.regexpWithFlags(node, `cardSetting.name`)
			} else {
				context.joinCardSettingNameFts = true
				context.like(node, 'cardSettingNameFts', 'name')
			}
			break
		}
		case settingId: {
			if (node.type === 'Regex') throwExp()
			const equals = sql.raw(node.negate ? '!=' : '=')
			context.parameterizeSql(sql`card.cardSettingId ${equals} ${node.value}`)
			break
		}
		case kind: {
			if (node.type === 'Regex') throwExp()
			context.joinLatestReview = true
			const n = serializeKind(node.value as KindEnum)
			const equals = sql.raw(node.negate ? 'IS NOT' : 'IS')
			context.parameterizeSql(sql`latestReview.kind ${equals} ${n}`)
			break
		}
		case state: {
			if (node.type === 'Regex') throwExp()
			const n = serializeState(node.value as StateEnum)
			if (n === 4) {
				if (node.negate) {
					context.trustedSql(`(card.state <> 1 AND card.state <> 2)`)
				} else {
					context.trustedSql(`(card.state = 1 OR card.state = 2)`)
				}
			} else {
				const equals = sql.raw(node.negate ? 'IS NOT' : 'IS')
				context.parameterizeSql(sql`card.state ${equals} ${n}`)
			}
			break
		}
		case reviewed: {
			if (node.type === 'Regex') throwExp()
			context.joinReview = true
			context.trustedSql('(')
			handleCreatedEditedDue(node, context, 'review', 'created')
			if (node.ratingComparison != null && node.rating != null) {
				context.parameterizeSql(
					sql` AND review.rating ${sql.raw(node.ratingComparison)} ${node.rating}`,
				)
			}
			context.trustedSql(')')
			break
		}
		case firstReviewed: {
			if (node.type === 'Regex') throwExp()
			context.joinFirstReview = true
			context.trustedSql('(')
			handleCreatedEditedDue(node, context, 'firstReview', 'created')
			if (node.ratingComparison != null && node.rating != null) {
				context.parameterizeSql(
					sql` AND firstReview.rating ${sql.raw(node.ratingComparison)} ${node.rating}`,
				)
			}
			context.trustedSql(')')
			break
		}
		case created: {
			handleCreatedEditedDue(node, context, undefined, 'created')
			break
		}
		case edited: {
			handleCreatedEditedDue(node, context, undefined, 'edited')
			break
		}
		case cardCreated: {
			handleCreatedEditedDue(node, context, 'card', 'created')
			break
		}
		case noteCreated: {
			handleCreatedEditedDue(node, context, 'note', 'created')
			break
		}
		case cardEdited: {
			handleCreatedEditedDue(node, context, 'card', 'edited')
			break
		}
		case noteEdited: {
			handleCreatedEditedDue(node, context, 'note', 'edited')
			break
		}
		case due: {
			handleCreatedEditedDue(node, context, 'card', 'due')
			break
		}
		case field: {
			serialize(node, context)
			break
		}
		case lapses: {
			if (node.type === 'Regex' || node.comparison == null) throwExp()
			context.parameterizeSql(
				sql`card.lapses ${sql.raw(node.comparison)} ${parseInt(node.value)}`,
			)
			break
		}
		case reps: {
			if (node.type === 'Regex' || node.comparison == null) throwExp()
			context.parameterizeSql(
				sql`card.repCount ${sql.raw(node.comparison)} ${parseInt(node.value)}`,
			)
			break
		}
		case tagCount: {
			context.cardTagCount = true
			context.noteTagCount = true
			handleTagCount(context, node, sql`card.tagCount + note.tagCount`)
			break
		}
		case cardTagCount: {
			context.cardTagCount = true
			handleTagCount(context, node, sql`card.tagCount`)
			break
		}
		case noteTagCount: {
			context.noteTagCount = true
			handleTagCount(context, node, sql`note.tagCount`)
			break
		}
		case undefined: {
			return throwExp()
		}
		default: {
			assertNever(node.label)
		}
	}
}

function handleTagCount(
	context: Context,
	node: QueryString | QueryRegex,
	col: RawBuilder<unknown>,
) {
	if (node.type === 'Regex' || node.comparison == null) throwExp()
	context.parameterizeSql(
		sql`${col} ${sql.raw(node.comparison)} ${parseInt(node.value)}`,
	)
}

function handleCreatedEditedDue(
	node: Node,
	context: Context,
	table: 'firstReview' | 'review' | 'note' | 'card' | undefined,
	column: 'created' | 'edited' | 'due',
) {
	if (node.type === number) {
		const val = context.now.getTime() - parseInt(node.value) * dayInMs
		handleComparison(val, context, table, column, node)
	} else if (node.type === simpleString) {
		const comp =
			node.value === 'true' ? '<=' : node.value === 'false' ? '>' : throwExp()
		handleOneComparison(context.now.getTime(), context, table, column, comp)
	} else if (node.type === date) {
		const [year, month, day] = node.value.split('-')
		if (year == null || month == null || day == null) throwExp()
		const local = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)) // `new Date("2009-01-01") != new Date("2009-1-1")` so I parseInt
		handleComparison(local.getTime(), context, table, column, node)
	} else {
		throwExp()
	}
	node.fieldValueHighlight = undefined
}

function handleComparison(
	msSinceEpoch: number,
	context: Context,
	table: 'firstReview' | 'review' | 'note' | 'card' | undefined,
	column: 'created' | 'edited' | 'due',
	node: QueryString,
) {
	if (node.comparison === '=') {
		context.trustedSql('(')
		handleOneComparison(msSinceEpoch, context, table, column, '>=')
		context.trustedSql('AND')
		handleOneComparison(msSinceEpoch + dayInMs, context, table, column, '<')
		context.trustedSql(')')
	} else {
		handleOneComparison(msSinceEpoch, context, table, column, node.comparison)
	}
}

function handleOneComparison(
	val: number,
	context: Context,
	table: 'firstReview' | 'review' | 'note' | 'card' | undefined,
	column: 'created' | 'edited' | 'due',
	comparison: Comparison | undefined,
) {
	if (comparison == null) throwExp()
	const comp = sql.raw(comparison)
	if (table == null) {
		const col = sql.raw(column)
		context.parameterizeSql(
			sql`(card.${col} ${comp} ${val} OR note.${col} ${comp} ${val})`,
		)
	} else {
		if (column === 'due') {
			context.parameterizeSql(sql`(card.due ${comp} ${val} AND card.due >= 0)`) // negative `due`s are not timestamps, but ordinals when the card is "new"
		} else {
			const tbl = sql.table(table)
			const col = sql.raw(column)
			context.parameterizeSql(sql`${tbl}.${col} ${comp} ${val}`)
		}
	}
}

function getJoinTableName(context: Context) {
	context.joinTableName++
	// x because sqlite doesn't like identifiers starting with numbers
	return `x${context.joinTableName}`
}

function buildTagSearch(node: QueryString | QueryRegex, context: Context) {
	const cardName = getJoinTableName(context)
	const noteName = getJoinTableName(context)
	if (node.type === 'Regex') {
		context.joinCardTag.push({
			name: cardName,
			sql: regexpWithFlags(node, `cardTag.tag`, true),
		})
		context.joinNoteTag.push({
			name: noteName,
			sql: regexpWithFlags(node, `noteTag.tag`, true),
		})
	} else {
		context.joinCardTagsFts.push({
			name: cardName,
			sql: glob(node, `cardTagFts`, `tag`, true),
		})
		context.joinNoteTagsFts.push({
			name: noteName,
			sql: glob(node, `noteTagFts`, `tag`, true),
		})
	}
	context.trustedSql(
		`(${cardName}.tag IS ${node.negate ? '' : 'NOT'} NULL ${
			node.negate ? 'AND' : 'OR'
		} ${noteName}.tag IS ${node.negate ? '' : 'NOT'} NULL)`,
	)
}

function getNot(negate: boolean, forcePositive?: true) {
	return forcePositive === true ? sql`` : sql.raw(negate ? 'NOT' : ``)
}

function maybeAddSeparator(node: SyntaxNode, context: Context) {
	const separator = andOrNothing(node.node)
	if (separator !== '') context.current.attach({ type: separator })
}

function andOrNothing(node: SyntaxNode): '' | typeof and | typeof or {
	let left = node.prevSibling
	while (left != null) {
		if (left.type.isError || left.type.is(qt.Not)) {
			left = left.prevSibling
			continue
		}

		if (left.type.is(qt.Or)) return or
		if (
			left.type.is(qt.Is) ||
			stringLabels.includes(left.name) ||
			left.type.is(qt.Comparison)
		) {
			return ''
		}
		if (
			left.type.is(qt.SimpleString) ||
			left.type.is(qt.Number) ||
			left.type.is(qt.Date) ||
			left.type.is(qt.Quoted1) ||
			left.type.is(qt.Quoted2) ||
			left.type.is(qt.RawQuoted) ||
			left.type.is(qt.RawHtml) ||
			left.type.is(qt.Regex) ||
			left.type.is(qt.Html) ||
			left.type.is(qt.Group) ||
			left.type.is(qt.Label) ||
			left.type.is(qt.KindEnum) ||
			node.type.is(qt.StateEnum) ||
			left.type.is(qt.DueEnum)
		) {
			return and
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface QueryString {
	type:
		| typeof simpleString
		| typeof quoted
		| typeof html
		| typeof number
		| typeof date
	label?: Label
	field?: QueryString | QueryRegex // there's only 1 level of recursion but whatever
	rating?: number
	ratingComparison?: Comparison
	value: string
	caseSensitive: boolean
	fieldValueHighlight?: FieldValueHighlight
	negate: boolean
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
	removeCombiningCharacters: boolean
	comparison?: Comparison
}

const comparisons = ['=', '<', '>', '<=', '>='] as const
type Comparison = (typeof comparisons)[number]

interface QueryRegex {
	type: typeof regex
	label?: Label
	field?: QueryString | QueryRegex // there's only 1 level of recursion but whatever
	pattern: string
	flags: string
	negate: boolean
	fieldValueHighlight: FieldValueHighlight
}

type Leaf = { type: typeof or | typeof and } | QueryString | QueryRegex

export type Node = Group | Leaf

type Label = (typeof labels)[number]

// types
const group = 'Group'
const simpleString = 'SimpleString'
const quoted = 'Quoted'
const html = 'Html'
const number = 'Number'
const date = 'Date'
const or = 'OR'
const and = 'AND'
const regex = 'Regex'

export class Group {
	constructor(parent: Group | null, negate: boolean, label?: Label) {
		this.parent = parent
		this.isRoot = parent == null
		this.children = []
		this.negate = negate
		this.label = label
	}

	type: typeof group = group
	label?: Label
	parent: Group | null
	isRoot: boolean
	children: Node[]
	negate: boolean

	attach(child: Node) {
		this.children.push(child)
		if (child.type === group) child.parent = this
	}

	attachMany(children: Node[]) {
		this.children.push(...children)
		for (const child of children) {
			if (child.type === group) child.parent = this
		}
	}
}

export function escapedQuoted1(str: string) {
	return str
		.replaceAll('[', '[[]') // this should be first
		.replaceAll("'", "[']")
		.replaceAll('*', '[*]')
		.replaceAll('?', '[?]')
}
export function escapedQuoted2(str: string) {
	return str
		.replaceAll('[', '[[]') // this should be first
		.replaceAll('"', '["]')
		.replaceAll('*', '[*]')
		.replaceAll('?', '[?]')
}
