import { createResource } from 'solid-js'

import { db } from '../db'

function StudyData() {
	const [cardStudy] = createResource(async () => await db.getCards(0, 100))
	return { cardStudy }
}

export default StudyData
