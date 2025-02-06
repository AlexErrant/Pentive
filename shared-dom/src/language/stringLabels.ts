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
export const stateEnums = [
	'normal',
	'buried',
	'userBuried',
	'schedulerBuried',
	'suspended',
] as const
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
