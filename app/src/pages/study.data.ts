import { createResource } from 'solid-js'

import { db } from '../db'
import { convert } from 'shared-dom'
import { C } from '../topLevelAwait'

function StudyData() {
	const query = ''
	const conversionResult = convert(query, C.getDate())
	const [cardStudy] = createResource(
		async () => await db.getCards(0, 100, query, conversionResult),
	)
	return { cardStudy }
}

export default StudyData
