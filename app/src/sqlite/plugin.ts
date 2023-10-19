import { type Plugin } from 'shared-dom'
import { rd, ky } from '../topLevelAwait'
import { type PluginName } from 'shared'
import { pluginEntityToDomain } from './util'

export const pluginCollectionMethods = {
	upsertPlugin: async function (plugin: Plugin) {
		const db = rd
		await db.exec(
			`INSERT INTO plugin (name,version,dependencies,created,updated,script)
                   VALUES (   ?,      ?,           ?,      ?,       ?,    ?)
       ON CONFLICT(name) DO UPDATE SET
         version=excluded.version,
         dependencies=excluded.dependencies,
         updated=excluded.updated,
         script=excluded.script`,
			[
				plugin.name,
				plugin.version,
				plugin.dependencies ?? null,
				plugin.created.getTime(),
				plugin.updated.getTime(),
				new Uint8Array(await plugin.script.arrayBuffer()),
			],
		)
	},
	getPlugins: async function (): Promise<Plugin[]> {
		const plugins = await ky.selectFrom('plugin').selectAll().execute()
		return plugins.map(pluginEntityToDomain)
	},
	deletePlugin: async function (name: PluginName) {
		await ky.deleteFrom('plugin').where('name', '=', name).execute()
	},
}
