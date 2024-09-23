import { registerPluginServices } from './pluginManager'
import { createDb, createKysely, createTx } from './sqlite/crsqlite'
import { pluginEntityToDomain } from './sqlite/util'
import { createResource } from 'solid-js'
import { cwaClient } from './trpcClient'
import { initThreadPool } from 'fsrs-browser'

// ****************************************************************
//
// below is global async state
//
// ****************************************************************

export const rd = await createDb()
export const ky = createKysely(rd)
export const tx = createTx(ky, rd)

const plugins = await ky.selectFrom('plugin').selectAll().execute()

export const C = await registerPluginServices(plugins.map(pluginEntityToDomain))

// ****************************************************************
//
// below is global state
//
// ****************************************************************

// lowTODO have hub send app a message when a successful login occurs
export const [whoAmI] = createResource(async () => {
	const r = await cwaClient.whoAmI.query().catch((e) => {
		if (window.navigator.onLine) {
			C.toastError('Error occurred while verifying identity.', e)
		} else {
			C.toastInfo('Cannot validate identity while offline.')
		}
		return undefined
	})
	return r?.tag === 'Ok' ? r.ok : undefined
})

// cSpell:ignore initted
let isInitted = false
export async function initFsrsTrainThreadPool() {
	if (!isInitted) {
		await initThreadPool(navigator.hardwareConcurrency)
		isInitted = true
	}
}

export { theme, setTheme, agGridTheme } from 'shared-dom/themeSelector'
