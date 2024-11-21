// This file is distinct from index.tsx because it is used by other entrypoints like hubmessenger.html

import { registerPluginServices } from './pluginManager'
import { createDb, createKysely, createTx } from './sqlite/crsqlite'
import { pluginEntityToDomain } from './sqlite/util'
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

// cSpell:ignore initted
let isInitted = false
export async function initFsrsTrainThreadPool() {
	if (!isInitted) {
		await initThreadPool(navigator.hardwareConcurrency)
		isInitted = true
	}
}
