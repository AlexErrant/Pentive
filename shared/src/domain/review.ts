import { type CardId, type ReviewId } from '../brand.js'

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

export type Review = {
	id: ReviewId
	cardId: CardId
	created: Date
	rating: number
	kind: number // 0=learn, 1=review, 2=relearn, 3=cram highTODO reconsider your life choices
} & Record<string, unknown>
