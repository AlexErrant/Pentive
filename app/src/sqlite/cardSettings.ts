import {
	type DB,
	type CardSetting as CardSettingEntity,
} from '../sqlite/database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type OnConflictTables,
} from 'kysely'
import { chunk } from 'lodash-es'
import { C, ky } from '../topLevelAwait'
import { type CardSettingId } from 'shared/brand'
import { type CardSetting } from 'shared/domain/cardSetting'

export const cardSettingsCollectionMethods = {
	bulkUploadCardSettings: async function (cardSetting: CardSetting[]) {
		const entities = cardSetting.map(
			({ id, name, ...r }) =>
				({
					id,
					name,
					details: stringifyDetails(r),
				}) satisfies CardSettingEntity,
		)
		const batches = chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('cardSetting batch ' + (i + 1) + '/' + batches.length)
			await ky
				.insertInto('cardSetting')
				.values(batches[i]!)
				.onConflict((db) =>
					db.doUpdateSet({
						name: (x) => x.ref('excluded.name'),
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
				id: s.id satisfies CardSettingId,
				name: s.name,
				...details,
			} satisfies CardSetting
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

// The point of this type is to cause an error if something is added to CardSettingEntity
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateCardSettingSet = {
	[K in keyof CardSettingEntity as Exclude<K, 'id'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'cardSetting'>,
			OnConflictTables<'cardSetting'>
		>,
	) => unknown
}
