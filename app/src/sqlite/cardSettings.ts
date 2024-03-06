import { type CardSettingId, type CardSetting } from 'shared'
import {
	type DB,
	type CardSetting as CardSettingEntity,
} from '../sqlite/database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type OnConflictTables,
} from 'kysely'
import _ from 'lodash'
import { C, ky } from '../topLevelAwait'

export const cardSettingsCollectionMethods = {
	bulkUploadCardSettings: async function (cardSetting: CardSetting[]) {
		const entities = cardSetting.map(
			({ id, ...r }) =>
				({
					id,
					details: stringifyDetails(r),
				}) satisfies CardSettingEntity,
		)
		const batches = _.chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('cardSetting batch ' + (i + 1) + '/' + batches.length)
			await ky
				.insertInto('cardSetting')
				.values(batches[i]!)
				.onConflict((db) =>
					db.doUpdateSet({
						details: (x) => x.ref('excluded.details'),
					} satisfies OnConflictUpdateCardSettingSet),
				)
				.execute()
		}
	},
	getCardSettings: async function () {
		const cardSettings = await ky
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

// the point of this type is to cause an error if something is added to CardSettingEntity
type OnConflictUpdateCardSettingSet = {
	[K in keyof CardSettingEntity as Exclude<K, 'id'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'cardSetting'>,
			OnConflictTables<'cardSetting'>
		>,
	) => unknown
}
