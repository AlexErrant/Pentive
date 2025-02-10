import type { CardId, ReviewId } from '../brand'

// export interface Review {
// 	score: Score
// 	created: Date
// 	ease: number // factor
// 	time: number // milliseconds from seeing front to score
//
// 	// the following three are mutually exclusive
// 	newStep?: number // index - see card settings
// 	lapsed?: number // index - see card settings
// 	interval?: number // in seconds
// }

export const kinds = [
	'learn',
	'review',
	'relearn',
	'filtered',
	'manual',
] as const
export type Kind = (typeof kinds)[number]

export type Review = {
	id: ReviewId
	cardId: CardId
	created: Date
	rating: number
	kind: Kind
} & Record<string, unknown>
