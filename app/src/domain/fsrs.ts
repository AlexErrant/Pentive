import { type Review } from 'shared'

const msInDay = 60 * 60 * 24 * 1000

function cardReviewsToDeltaTs(reviews: Review[]) {
	const deltaTs = new Uint32Array(reviews.length)
	deltaTs[0] = 0
	for (let i = 0; i < reviews.length - 1; i++) {
		const current = reviews[i]!
		const next = reviews[i + 1]!
		const deltaMs = next.created.getTime() - current.created.getTime()
		const days = Math.floor(deltaMs / msInDay)
		deltaTs[i + 1] = days
	}
	return deltaTs
}

function cardReviewsToRatings(reviews: Review[]) {
	return new Uint32Array(reviews.map((r) => r.rating))
}

export function reviewsToFsrsItems(reviews: Review[]) {
	let currentCardId = reviews[0]?.cardId
	if (currentCardId == null) return null
	const deltaTs: Uint32Array[] = []
	const ratings: Uint32Array[] = []
	const lengths: number[] = []
	let start = 0
	function update(i: number) {
		const cardReviews = reviews.slice(start, i)
		deltaTs.push(cardReviewsToDeltaTs(cardReviews))
		ratings.push(cardReviewsToRatings(cardReviews))
		lengths.push(i - start)
	}
	for (let i = 0; i < reviews.length; i++) {
		const review = reviews[i]!
		if (review.cardId !== currentCardId) {
			update(i)
			currentCardId = review.cardId
			start = i
		}
	}
	update(reviews.length)
	return {
		deltaTs: concat(deltaTs),
		ratings: concat(ratings),
		lengths: Uint32Array.from(lengths),
	}
}

// https://stackoverflow.com/a/59902602
function concat(arrays: Uint32Array[]) {
	const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
	const result = new Uint32Array(totalLength)
	let length = 0
	for (const array of arrays) {
		result.set(array, length)
		length += array.length
	}
	return result
}
