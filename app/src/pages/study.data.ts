import { db } from '../db'
import { convert } from 'shared-dom'
import { C } from '../topLevelAwait'
import { cache } from '@solidjs/router'

export const getCards = cache(async () => {
	const query = ''
	const conversionResult = convert(query, C.getDate())
	return await db.getCards(0, 100, query, conversionResult)
}, 'cardStudy')
