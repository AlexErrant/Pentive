import { createResource } from 'solid-js'

import { db } from '../db'

function TemplatesData() {
	const [templates] = createResource(db.getTemplates, {
		initialValue: [],
	})
	return templates
}

export default TemplatesData
