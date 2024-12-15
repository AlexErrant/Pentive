import { type DB, type SettingBase } from '../sqlite/database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type OnConflictTables,
} from 'kysely'
import { chunk } from 'lodash-es'
import { C, ky } from '../topLevelAwait'
import { fromLDbId, toLDbId } from 'shared/brand'
import { type Setting } from 'shared/domain/setting'
import { objEntries } from 'shared/utility'

export const settingsCollectionMethods = {
	bulkUploadSettings: async function (settings: Setting[]) {
		const entities = settings.flatMap((setting) =>
			objEntries(setting).map(
				([key, value]) =>
					({
						id: toLDbId(setting.id),
						key,
						value,
					}) satisfies SettingBase,
			),
		)
		const batches = chunk(entities, 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('setting batch ' + (i + 1) + '/' + batches.length)
			await ky
				.insertInto('settingBase')
				.values(batches[i]!)
				.onConflict(
					(db) =>
						db.doUpdateSet({
							key: (x) => x.ref('excluded.key'),
							value: (x) => x.ref('excluded.value'),
						} satisfies OnConflictUpdateSettingBaseSet),
					// medTODO support deleting
				)
				.execute()
		}
	},
	getSettings: async function () {
		const settings = await ky.selectFrom('setting').selectAll().execute()
		return settings.map((s) => {
			const json = parseJson(s.json)
			return {
				id: fromLDbId(s.id),
				name: json.name ?? 'Placeholder Name',
				...json,
			} satisfies Setting
		})
	},
}

// highTODO property test
export function stringifyDetails(json: Record<string, unknown>) {
	return JSON.stringify(json)
}

export function parseJson(rawJson: string) {
	return JSON.parse(rawJson) as Record<string, string>
}

// The point of this type is to cause an error if something is added to SettingBase
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateSettingBaseSet = {
	[K in keyof SettingBase as Exclude<K, 'id'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'settingBase'>,
			OnConflictTables<'settingBase'>
		>,
	) => unknown
}
