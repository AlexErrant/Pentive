import { type DB, type Setting as SettingEntity } from '../sqlite/database'
import {
	type SelectQueryBuilder,
	type ExpressionBuilder,
	type OnConflictDatabase,
	type OnConflictTables,
	type InsertObject,
} from 'kysely'
import { chunk } from 'lodash-es'
import { C, ky } from '../topLevelAwait'
import {
	type CardSettingId,
	fromLDbId,
	toLDbId,
	type UserSettingId,
	userSettingId,
} from 'shared/brand'
import {
	type CardSetting,
	type UserSetting,
	type Setting,
} from 'shared/domain/setting'
import { objEntries } from 'shared/utility'
import { delimiter, encodeValue, unflattenObject } from './util'

export const settingsCollectionMethods = {
	deleteAllSettings: async function () {
		await ky.deleteFrom('setting').execute()
	},
	bulkUploadSettings: async function (settings: Setting[]) {
		const entities = settings.flatMap((setting) =>
			objEntries(setting).map(([key, value]) => {
				if (key === '__proto__') {
					C.toastFatal('"__proto__" is not a valid key name.')
				}
				if (key.includes(delimiter)) {
					C.toastFatal(
						`The '${delimiter}' character is not allowed in a key's name.`,
					)
				}
				if (typeof value === 'number' && isNaN(value)) {
					C.toastFatal('"NaN" is not a valid value.')
				}
				return {
					id: toLDbId(setting.id),
					key,
					value: encodeValue(value),
				} satisfies InsertObject<DB, 'setting'>
			}),
		)
		const batches = chunk(entities, 100)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('setting batch ' + (i + 1) + '/' + batches.length)
			await ky
				.insertInto('setting')
				.values(batches[i]!)
				.onConflict(
					(db) =>
						db.doUpdateSet({
							value: (x) => x.ref('excluded.value'),
						} satisfies OnConflictUpdateSettingSet),
					// medTODO support deleting
				)
				.execute()
		}
	},
	getSettings: async function (
		func?: (
			qb: SelectQueryBuilder<DB, 'setting', Record<never, never>>,
		) => SelectQueryBuilder<DB, 'setting', Record<never, never>>,
		skipUserSetting?: true,
	) {
		const settingEntities = await ky
			.selectFrom('setting')
			.$if(func != null, func!)
			.selectAll()
			.execute()
		const groupedSettings = groupBy(settingEntities, (s) =>
			fromLDbId<UserSettingId | CardSettingId>(s.id),
		)
		let hasUserSetting = false
		const r = objEntries(groupedSettings).map(([id, settings]) => {
			const keyVals = settings.map((s) => [s.key, s.value] as const)
			if (id === userSettingId) {
				hasUserSetting = true
				return {
					id,
					name: userSettingName,
					...unflattenObject(keyVals),
				} satisfies UserSetting
			}
			const obj = unflattenObject(keyVals)
			return {
				...obj,
				id: id as CardSettingId,
				name: typeof obj.name === 'string' ? obj.name : 'Placeholder Name',
			} satisfies CardSetting
		})
		if (!skipUserSetting && !hasUserSetting) {
			r.push({
				id: userSettingId,
				name: userSettingName,
			} satisfies UserSetting)
		}
		return r
	},
	getCardSettings: async function () {
		const r = await this.getSettings(
			(db) => db.where('id', '<>', toLDbId(userSettingId)),
			true,
		)
		return r as CardSetting[]
	},
	getUserSettings: async function () {
		const r = await this.getSettings((db) =>
			db.where('id', '=', toLDbId(userSettingId)),
		)
		return r[0] as UserSetting
	},
}

// https://stackoverflow.com/a/64489535

const groupBy = <T>(
	array: T[],
	predicate: (value: T, index: number, array: T[]) => string,
) =>
	array.reduce<Record<string, T[]>>((acc, value, index, array) => {
		;(acc[predicate(value, index, array)] ||= []).push(value)
		return acc
	}, {})

const userSettingName = 'User Settings'

// highTODO property test
export function stringifyDetails(json: Record<string, unknown>) {
	return JSON.stringify(json)
}

export function parseJson(rawJson: string) {
	return JSON.parse(rawJson) as Record<string, string>
}

// The point of this type is to cause an error if something is added to SettingEntity
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateSettingSet = {
	[K in keyof SettingEntity as Exclude<K, 'id' | 'key'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'setting'>,
			OnConflictTables<'setting'>
		>,
	) => unknown
}
