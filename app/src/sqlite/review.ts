import { type CardId, type Review } from 'shared'
import { type Review as ReviewEntity } from '../sqlite/database'
import _ from 'lodash'
import { C, ky } from '../topLevelAwait'

function toEntity({ id, cardId, created, rating, kind, ...r }: Review) {
	return {
		id,
		cardId,
		rating,
		kind,
		created: created.getTime(),
		details: stringifyDetails(r),
	} satisfies ReviewEntity
}

export const reviewCollectionMethods = {
	insertReview: async function (review: Review) {
		const entity = toEntity(review)
		await ky.insertInto('review').values(entity).execute()
	},
	bulkUploadReview: async function (reviews: Review[]) {
		const entities = reviews.map(toEntity)
		const batches = _.chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('review batch ' + (i + 1) + '/' + batches.length)
			await ky.insertInto('review').values(batches[i]!).execute()
		}
	},
	getReviews: async function () {
		const reviews = await ky
			.selectFrom('review')
			.selectAll()
			.orderBy('cardId')
			.orderBy('created')
			.execute()
		return reviews.map(
			({ details, created, ...r }) =>
				({
					...r,
					created: new Date(created),
					...parseDetails(details),
				}) satisfies Review as Review,
		)
	},
	getFsrsItems: async function () {
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
		let currentCardId = '' as CardId
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
	getFsrsItemsForCard: async function (cardId: CardId) {
		const reviews = await ky
			.selectFrom('review')
			.where('cardId', '=', cardId) // highTODO filter out manual reviews and other edge cases
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
