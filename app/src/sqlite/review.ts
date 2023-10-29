import { type Review } from 'shared'
import { type Review as ReviewEntity } from '../sqlite/database'
import _ from 'lodash'
import { toastInfo } from '../components/toasts'
import { ky } from '../topLevelAwait'

export const reviewCollectionMethods = {
	bulkUploadReview: async function (reviews: Review[]) {
		const entities = reviews.map(
			({ id, cardId, created, rating, ...r }) =>
				({
					id,
					cardId,
					rating,
					created: created.getTime(),
					details: stringifyDetails(r),
				}) satisfies ReviewEntity,
		)
		const batches = _.chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			toastInfo('review batch ' + (i + 1) + '/' + batches.length)
			await ky.insertInto('review').values(batches[i]!).execute()
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
