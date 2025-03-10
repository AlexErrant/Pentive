import type { Review as ReviewEntity } from '../sqlite/database'
import { chunk } from 'lodash-es'
import { C, ky } from '../topLevelAwait'
import { fromLDbId, toLDbId, type LDbId, type CardId } from 'shared/brand'
import type { Review, Kind } from 'shared/domain/review'
import { assertNever } from 'shared/utility'

function serializeKind(s: Kind): number {
	switch (s) {
		case 'learn':
			return 0
		case 'review':
			return 1
		case 'relearn':
			return 2
		case 'filtered':
			return 3
		case 'manual':
			return 4
		default:
			return assertNever(s)
	}
}

function deserializeKind(s: number): Kind {
	switch (s) {
		case 0:
			return 'learn'
		case 1:
			return 'review'
		case 2:
			return 'relearn'
		case 3:
			return 'filtered'
		case 4:
			return 'manual'
		default:
			return C.toastImpossible(`Expected 0, 1, 2, 3, or 4, but got ${s}`)
	}
}

function toEntity({ id, cardId, created, rating, kind, ...r }: Review) {
	return {
		id: toLDbId(id),
		cardId: toLDbId(cardId),
		rating,
		kind: serializeKind(kind),
		created: created.getTime(),
		details: stringifyDetails(r),
	} satisfies ReviewEntity
}

export const reviewCollectionMethods = {
	async insertReview(review: Review) {
		const entity = toEntity(review)
		await ky.insertInto('review').values(entity).execute()
	},
	async bulkUploadReview(reviews: Review[]) {
		const entities = reviews.map(toEntity)
		const batches = chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo(`review batch ${i + 1}/${batches.length}`)
			await ky.insertInto('review').values(batches[i]!).execute()
		}
	},
	async getReviews() {
		const reviews = await ky
			.selectFrom('review')
			.selectAll()
			.orderBy('cardId')
			.orderBy('created')
			.execute()
		return reviews.map(
			({ id, cardId, details, created, kind, ...r }) =>
				({
					...r,
					id: fromLDbId(id),
					cardId: fromLDbId(cardId),
					created: new Date(created),
					kind: deserializeKind(kind),
					...parseDetails(details),
				}) satisfies Review as Review,
		)
	},
	async getFsrsItems() {
		const reviews = await ky
			.selectFrom('review')
			// highTODO filter out manual reviews and other edge cases
			.select(['rating', 'created', 'kind', 'cardId'])
			.orderBy('cardId')
			.orderBy('created')
			.execute()
		const cids = new BigInt64Array(reviews.length) // not given values since cids don't do anything in fsrs-browser, as long as it's for 1 card
		const eases = new Uint8Array(reviews.length)
		const ids = new BigInt64Array(reviews.length)
		const types = new Uint8Array(reviews.length)
		let currentCardId = '' as LDbId
		let cid = BigInt(0)
		for (let index = 0; index < reviews.length; index++) {
			const review = reviews[index]!
			// fsrs only uses cids for grouping, but needs it to be an i64, so we convert it
			if (currentCardId !== review.cardId) {
				cid++
				currentCardId = review.cardId
			}
			cids[index] = cid
			eases[index] = review.rating
			ids[index] = BigInt(review.created)
			types[index] = review.kind
		}
		return {
			eases,
			ids,
			cids,
			types,
		}
	},
	async getFsrsItemsForCard(cardId: CardId) {
		const reviews = await ky
			.selectFrom('review')
			.where('cardId', '=', toLDbId(cardId)) // highTODO filter out manual reviews and other edge cases
			.select(['rating', 'created', 'kind'])
			.orderBy('cardId')
			.orderBy('created')
			.execute()
		const cids = new BigInt64Array(reviews.length) // not given values since cids don't do anything in fsrs-browser, as long as it's for 1 card
		const eases = new Uint8Array(reviews.length)
		const ids = new BigInt64Array(reviews.length)
		const types = new Uint8Array(reviews.length)
		for (let index = 0; index < reviews.length; index++) {
			const review = reviews[index]!
			eases[index] = review.rating
			ids[index] = BigInt(review.created)
			types[index] = review.kind
		}
		return {
			eases,
			ids,
			cids,
			types,
		}
	},
}

// highTODO property test
function stringifyDetails(details: Record<string, unknown>) {
	return JSON.stringify(details)
}

function parseDetails(rawDetails: string) {
	return JSON.parse(rawDetails) as Record<string, unknown>
}
