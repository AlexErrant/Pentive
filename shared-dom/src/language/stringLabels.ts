export const tag = 'tag' as const
export const template = 'template' as const
export const templateId = 'templateId' as const
export const setting = 'setting' as const
const field = 'field' as const
const cardId = 'cardId' as const
const noteId = 'noteId' as const
export const settingId = 'settingId' as const
const state = 'state' as const
const kind = 'kind' as const
const due = 'due' as const
const note = 'note' as const
const card = 'card' as const
const created = 'created' as const
const edited = 'edited' as const
const reps = 'reps' as const
const lapses = 'lapses' as const
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
	note,
	card,
	created,
	edited,
	reps,
	lapses,
	reviewed,
	firstReviewed,
] as const
export const stringLabels = labels as readonly string[]
