import { getKysely } from './crsqlite'
import { type Review } from 'shared'
import { type DB, type Review as ReviewEntity } from '../sqlite/database'
import { type Kysely } from 'kysely'
import _ from 'lodash'
import { toastInfo } from '../components/toasts'

export const reviewCollectionMethods = {
	bulkUploadReview: async function (reviews: Review[], db?: Kysely<DB>) {
		db ??= await getKysely()
		const entities = reviews.map(
			({ id, cardId, ...r }) =>
				({
					id,
					cardId,
					details: stringifyDetails(r),
				}) satisfies ReviewEntity,
		)
		const batches = _.chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			toastInfo('review batch ' + (i + 1) + '/' + batches.length)
			await db.insertInto('review').values(batches[i]!).execute()
		}
	},
}

// highTODO property test
export function stringifyDetails(details: unknown) {
	return JSON.stringify(details)
}

export function parseDetails<T>(rawDetails: string) {
	return JSON.parse(rawDetails) as T
}
