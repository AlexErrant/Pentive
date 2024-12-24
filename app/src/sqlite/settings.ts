import { type DB, type SettingBase } from '../sqlite/database'
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
import { encodeValue, unflattenObject } from './util'

export const settingsCollectionMethods = {
	bulkUploadSettings: async function (settings: Setting[]) {
		const entities = settings.flatMap((setting) =>
			objEntries(setting).map(
				([key, value]) =>
					({
						id: toLDbId(setting.id),
						key,
						value: encodeValue(value),
					}) satisfies InsertObject<DB, 'settingBase'>,
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
	getSettings: async function (
		func?: (
			qb: SelectQueryBuilder<DB, 'settingBase', Record<never, never>>,
		) => SelectQueryBuilder<DB, 'settingBase', Record<never, never>>,
	) {
		const settingEntities = await ky
			.selectFrom('settingBase')
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
		if (!hasUserSetting) {
			r.push({
				id: userSettingId,
				name: userSettingName,
			} satisfies UserSetting)
		}
		return r
	},
	getCardSettings: async function () {
		const r = await this.getSettings((db) =>
			db.where('id', '<>', toLDbId(userSettingId)),
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
