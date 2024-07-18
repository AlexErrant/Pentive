export const tag = 'tag' as const
export const template = 'template' as const
export const templateId = 'templateId' as const
export const setting = 'setting' as const
export const field = 'field' as const
const cardId = 'cardId' as const
const noteId = 'noteId' as const
export const settingId = 'settingId' as const
const state = 'state' as const
export const kind = 'kind' as const
export const due = 'due' as const
export const noteCreated = 'noteCreated' as const
export const noteEdited = 'noteEdited' as const
export const cardCreated = 'cardCreated' as const
export const cardEdited = 'cardEdited' as const
export const created = 'created' as const
export const edited = 'edited' as const
export const reps = 'reps' as const
export const lapses = 'lapses' as const
export const tagCount = 'tagCount' as const
export const noteTagCount = 'noteTagCount' as const
export const cardTagCount = 'cardTagCount' as const
export const reviewed = 'reviewed' as const
export const firstReviewed = 'firstReviewed' as const
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
