import { db } from './db'
import { registerPluginServices } from './pluginManager'
import { createCrRtc, createDb } from './sqlite/crsqlite'

export const rd = await createDb()
export const crRtc = await createCrRtc(rd)

const plugins = await db.getPlugins()

export const C = await registerPluginServices(plugins)
