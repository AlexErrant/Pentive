import { type UserSettingId, type CardSettingId } from '../brand'

// update upon change 4CB24F8E-889C-472C-835A-A5A780C34963
type SettingPrimitive = string | number | boolean | null
export type SettingValue = SettingPrimitive | SettingPrimitive[]

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
