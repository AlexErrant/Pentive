import { getKysely } from './crsqlite'
import { type CardSetting } from 'shared'
import {
	type DB,
	type CardSetting as CardSettingEntity,
} from '../sqlite/database'
import { type Kysely } from 'kysely'
import _ from 'lodash'
import { toastInfo } from '../components/toasts'

export const cardSettingsCollectionMethods = {
	bulkUploadCardSettings: async function (
		cardSetting: CardSetting[],
		db?: Kysely<DB>,
	) {
		db ??= await getKysely()
		const entities = cardSetting.map(
			({ id, ...r }) =>
				({
					id,
					details: stringifyDetails(r),
				}) satisfies CardSettingEntity,
		)
		const batches = _.chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			toastInfo('cardSetting batch ' + (i + 1) + '/' + batches.length)
			await db.insertInto('cardSetting').values(batches[i]!).execute()
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
