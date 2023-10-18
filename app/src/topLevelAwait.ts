import { db } from './db'
import { registerPluginServices } from './pluginManager'

const plugins = await db.getPlugins()

export const C = await registerPluginServices(plugins)
