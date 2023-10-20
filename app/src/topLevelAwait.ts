import { registerPluginServices } from './pluginManager'
import { createDb, createKysely, createTx } from './sqlite/crsqlite'
import { pluginEntityToDomain } from './sqlite/util'

export const rd = await createDb()
export const ky = createKysely(rd)
export const tx = createTx(ky, rd)

const plugins = await ky.selectFrom('plugin').selectAll().execute()

export const C = await registerPluginServices(plugins.map(pluginEntityToDomain))
