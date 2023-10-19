import { db } from './db'
import { registerPluginServices } from './pluginManager'
import { createDb } from './sqlite/crsqlite'

export const rd = await createDb()

const plugins = await db.getPlugins()

export const C = await registerPluginServices(plugins)
