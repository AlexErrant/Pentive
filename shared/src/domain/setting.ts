import { type SettingId } from '../brand'

export type Setting = {
	id: SettingId
	name: string
} & Record<string, string | number>

export const getDefaultSetting = (id: SettingId) =>
	({
		id,
		name: 'New Setting',
	}) satisfies Setting
