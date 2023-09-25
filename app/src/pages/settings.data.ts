import { createResource } from 'solid-js'

import { db } from '../db'

function SettingsData() {
	const [cardSettings] = createResource(db.getCardSettings, {
		initialValue: [],
	})
	return { cardSettings }
}

export default SettingsData
