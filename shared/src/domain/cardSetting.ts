import { type CardSettingId } from '../brand.js'

export type CardSetting = {
	id: CardSettingId
	name: string
} & Record<string, unknown>

export const getDefaultCardSetting = (id: CardSettingId): CardSetting => ({
	id,
	name: 'New Card Setting',
})
