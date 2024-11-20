import { cache } from '@solidjs/router'
import { C } from '../topLevelAwait'

export const getCardSettings = cache(C.db.getCardSettings, 'cardSettings')
