import { query } from '@solidjs/router'
import { C } from '../topLevelAwait'

export const getSettings = query(
	async () => await C.db.getSettings(),
	'settings',
)
