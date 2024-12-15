import { type SettingId } from '../brand'

export type Setting = {
	id: SettingId
	name: string
} & Record<string, string>
