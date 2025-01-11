import { convert } from 'shared-dom/language/query2sql'
import { C } from '../topLevelAwait'
import { query } from '@solidjs/router'

export const getCards = query(async () => {
	const query = ''
	const conversionResult = convert(query, C.getDate())
	return await C.db.getCards(0, 100, query, conversionResult)
}, 'cardStudy')
