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
	type SettingValue,
	type SettingRecord,
} from 'shared/domain/setting'
import { objEntries } from 'shared/utility'

export const settingsCollectionMethods = {
	deleteAllSettings: async function () {
		await ky.deleteFrom('setting').execute()
	},
	bulkUploadSettings: async function (settings: Setting[]) {
		const entities = settings.flatMap((setting) =>
			objEntries(flattenObject(setting)).map(
				([key, value]) =>
					({
						id: toLDbId(setting.id),
						key,
						value: encodeValue(value as Exclude<typeof value, SettingRecord>),
					}) satisfies InsertObject<DB, 'setting'>,
			),
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

// medTODO property test
const encoder = new TextEncoder() // always utf-8
const decoder = new TextDecoder('utf-8')
export function encodeValue(rawValue: SettingValue) {
	return Array.isArray(rawValue) || typeof rawValue === 'boolean'
		? encoder.encode(JSON.stringify(rawValue))
		: rawValue
}
function decodeValue(value: Uint8Array) {
	return JSON.parse(decoder.decode(value)) as SettingValue
}

export const delimiter = '/'

export function flattenObject(obj: SettingRecord, parentKey: string = '') {
	const result: Record<string, SettingValue> = {}
	const entries = objEntries(obj)
	if (entries.length === 0) {
		C.toastFatal('Settings object must have at least 1 key-value pair.')
	}
	for (const [key, value] of entries) {
		if (key === '__proto__') {
			C.toastFatal('"__proto__" is not a valid key name.')
		}
		if (key.length === 0) {
			C.toastFatal('key cannot be empty')
		}
		if (key.includes(delimiter)) {
			C.toastFatal(
				`The '${delimiter}' character is not allowed in a key's name: ${key}`,
			)
		}
		if (typeof value === 'number' && isNaN(value)) {
			C.toastFatal('"NaN" is not a valid value.')
		}
		const newKey = parentKey === '' ? key : `${parentKey}${delimiter}${key}`
		if (typeof value === 'object' && !Array.isArray(value) && value != null) {
			Object.assign(result, flattenObject(value, newKey))
		} else {
			result[newKey] = value
		}
	}
	return result
}

export function unflattenObject(
	flattened: Array<readonly [string, SettingEntity['value']]>,
) {
	const result = Object.create(null) as SettingRecord
	for (const [key, value] of flattened) {
		const keys = key.split(delimiter)
		let currentLevel: SettingRecord = result
		for (let i = 0; i < keys.length; i++) {
			const segment = keys[i]!
			if (/* "is last" */ i === keys.length - 1) {
				if (ArrayBuffer.isView(value)) {
					currentLevel[segment] = decodeValue(value)
				} else {
					currentLevel[segment] = value
				}
			} else {
				currentLevel = (currentLevel[segment] as SettingRecord) ??=
					Object.create(null)
			}
		}
	}
	return result
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
