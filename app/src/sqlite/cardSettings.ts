import { getKysely } from './crsqlite'
import { type CardSettingId, type CardSetting } from 'shared'
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
	getCardSettings: async function () {
		const db = await getKysely()
		const cardSettings = await db
			.selectFrom('cardSetting')
			.selectAll()
			.execute()
		return cardSettings.map((s) => {
			const details = parseDetails(s.details)
			return {
				id: s.id satisfies CardSettingId as CardSettingId,
				name: details.name as string, // nextTODO
				...details,
			} satisfies CardSetting as CardSetting
		})
	},
}

// highTODO property test
export function stringifyDetails(details: Record<string, unknown>) {
	return JSON.stringify(details)
}

export function parseDetails(rawDetails: string) {
	return JSON.parse(rawDetails) as Record<string, unknown>
}
