export const tag = 'tag' as const
export const template = 'template' as const
export const templateId = 'templateId' as const
export const setting = 'setting' as const
const field = 'field' as const
const cardId = 'cardId' as const
const noteId = 'noteId' as const
export const settingId = 'settingId' as const
const state = 'state' as const
export const kind = 'kind' as const
const due = 'due' as const
const noteCreated = 'noteCreated' as const
const noteEdited = 'noteEdited' as const
const cardCreated = 'cardCreated' as const
const cardEdited = 'cardEdited' as const
const created = 'created' as const
const edited = 'edited' as const
const reps = 'reps' as const
const lapses = 'lapses' as const
const tagCount = 'tagCount' as const
const noteTagCount = 'noteTagCount' as const
const cardTagCount = 'cardTagCount' as const
const reviewed = 'reviewed' as const
const firstReviewed = 'firstReviewed' as const
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
