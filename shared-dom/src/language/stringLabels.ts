import { assertNever } from 'shared/utility'
export const tag = 'tag'
export const template = 'template'
export const templateId = 'templateId'
export const setting = 'setting'
export const field = 'field'
export const cardId = 'cardId'
export const noteId = 'noteId'
export const settingId = 'settingId'
export const state = 'state'
export const kind = 'kind'
export const due = 'due'
export const noteCreated = 'noteCreated'
export const noteEdited = 'noteEdited'
export const cardCreated = 'cardCreated'
export const cardEdited = 'cardEdited'
export const created = 'created'
export const edited = 'edited'
export const reps = 'reps'
export const lapses = 'lapses'
export const tagCount = 'tagCount'
export const noteTagCount = 'noteTagCount'
export const cardTagCount = 'cardTagCount'
export const reviewed = 'reviewed'
export const firstReviewed = 'firstReviewed'
export const labels = [
	tag,
	template,
	templateId,
	setting,
	field,
	cardId,
	noteId,
	settingId,
	state,
	kind,
	due,
	noteCreated,
	noteEdited,
	cardCreated,
	cardEdited,
	created,
	edited,
	reps,
	lapses,
	tagCount,
	cardTagCount,
	noteTagCount,
	reviewed,
	firstReviewed,
] as const
export const stringLabels = labels as readonly string[]

export const kindEnums = ['new', 'learn', 'review', 'relearn', 'cram'] as const
export type KindEnum = (typeof kindEnums)[number]
export function serializeKind(kind: KindEnum) {
	switch (kind) {
		case 'new':
			return null
		case 'learn':
			return 0
		case 'review':
			return 1
		case 'relearn':
			return 2
		case 'cram':
			return 3
		default:
			return assertNever(kind)
	}
}

export const stateEnums = [
	'normal',
	'buried',
	'userBuried',
	'schedulerBuried',
	'suspended',
] as const
export type StateEnum = (typeof stateEnums)[number]
export function serializeState(state: StateEnum) {
	switch (state) {
		case 'normal':
			return null
		case 'schedulerBuried':
			return 1
		case 'userBuried':
			return 2
		case 'suspended':
			return 3
		case 'buried':
			return 4
		default:
			return assertNever(state)
	}
}

export const ratingEnums = ['again', 'hard', 'good', 'easy'] as const
export const dateValuedLabels = [
	due,
	cardCreated,
	noteCreated,
	cardEdited,
	noteEdited,
	created,
	edited,
	reviewed,
	firstReviewed,
]

export const isDateValuedLabel = (x: string) =>
	dateValuedLabels.includes(x as never)

export const numberValuedLabels = [
	reps,
	lapses,
	tagCount,
	cardTagCount,
	noteTagCount,
]
export const isNumberValuedLabel = (x: string) =>
	numberValuedLabels.includes(x as never)
