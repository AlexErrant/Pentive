import { type UserSettingId, type CardSettingId } from '../brand'

export type UserSetting = {
	id: UserSettingId
	name: string
} & Record<string, string | number>

export type CardSetting = {
	id: CardSettingId
	name: string
} & Record<string, string | number>

export type Setting = UserSetting | CardSetting

export const getDefaultSetting = (id: CardSettingId) =>
	({
		id,
		name: 'New Setting',
	}) satisfies CardSetting
