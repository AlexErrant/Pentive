import { cache } from '@solidjs/router'
import { C } from '../topLevelAwait'

export const getTemplates = cache(C.db.getTemplates, 'templates')
