import { db } from '../db'
import { cache } from '@solidjs/router'

export const getCardSettings = cache(db.getCardSettings, 'cardSettings')
