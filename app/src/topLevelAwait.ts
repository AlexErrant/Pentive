import { db } from './db'
import { registerPluginServices } from './pluginManager'
import {
	createCrRtc,
	createDb,
	createKysely,
	createTx,
} from './sqlite/crsqlite'

export const rd = await createDb()
export const crRtc = await createCrRtc(rd)
export const ky = createKysely(rd)
export const tx = createTx(ky, rd)

const plugins = await db.getPlugins()

export const C = await registerPluginServices(plugins)
