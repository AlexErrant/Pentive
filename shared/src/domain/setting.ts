import { type CardSettingId, type SettingId } from '../brand'

export type Setting = {
	id: SettingId
	name: string
} & Record<string, string | number>

export type CardSetting = {
	id: CardSettingId
	name: string
} & Record<string, string | number>

export const getDefaultSetting = (id: SettingId) =>
	({
		id,
		name: 'New Setting',
	}) satisfies Setting
