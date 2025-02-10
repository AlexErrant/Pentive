import type { UserSettingId, CardSettingId } from '../brand'

// update upon change 4CB24F8E-889C-472C-835A-A5A780C34963
type SettingPrimitive = string | number | boolean | null
export type SettingValue = SettingPrimitive | SettingPrimitive[]

export interface SettingRecord {
	[key: string]: SettingValue | SettingRecord
}

export type UserSetting = {
	id: UserSettingId
	name: string
} & SettingRecord

export type CardSetting = {
	id: CardSettingId
	name: string
} & SettingRecord

export type Setting = UserSetting | CardSetting

export const getDefaultSetting = (id: CardSettingId) =>
	({
		id,
		name: 'New Setting',
	}) satisfies CardSetting
