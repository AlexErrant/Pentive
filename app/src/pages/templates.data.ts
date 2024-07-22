import { db } from '../db'
import { cache } from '@solidjs/router'

export const getTemplates = cache(db.getTemplates, 'templates')
