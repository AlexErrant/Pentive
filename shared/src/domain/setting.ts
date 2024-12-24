import { type UserSettingId, type CardSettingId } from '../brand'

export type SettingValue = string | number | boolean | number[]

export type UserSetting = {
	id: UserSettingId
	name: string
} & Record<string, SettingValue>

export type CardSetting = {
	id: CardSettingId
	name: string
} & Record<string, SettingValue>

export type Setting = UserSetting | CardSetting

export const getDefaultSetting = (id: CardSettingId) =>
	({
		id,
		name: 'New Setting',
	}) satisfies CardSetting
