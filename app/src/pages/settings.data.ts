import { query } from '@solidjs/router'
import { C } from '../topLevelAwait'

export const getSettings = query(C.db.getSettings, 'settings')
