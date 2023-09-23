import { type CardSettingId } from '../brand.js'

export type CardSetting = {
	id: CardSettingId
} & Record<string, unknown>
