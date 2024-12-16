import { cache } from '@solidjs/router'
import { C } from '../topLevelAwait'

export const getSettings = cache(C.db.getSettings, 'settings')
