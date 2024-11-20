import { convert } from 'shared-dom/language/query2sql'
import { C } from '../topLevelAwait'
import { cache } from '@solidjs/router'

export const getCards = cache(async () => {
	const query = ''
	const conversionResult = convert(query, C.getDate())
	return await C.db.getCards(0, 100, query, conversionResult)
}, 'cardStudy')
