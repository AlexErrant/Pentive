import { type Plugin } from 'shared-dom/plugin'
import { rd, ky } from '../topLevelAwait'
import { pluginEntityToDomain } from './util'
import { type PluginName } from 'shared/brand'

export const pluginCollectionMethods = {
	upsertPlugin: async function (plugin: Plugin) {
		const db = rd
		await db.exec(
			`INSERT INTO plugin (name,version,dependencies,created,edited,script)
                   VALUES (   ?,      ?,           ?,      ?,       ?,    ?)
       ON CONFLICT(name) DO UPDATE SET
         version=excluded.version,
         dependencies=excluded.dependencies,
         edited=excluded.edited,
         script=excluded.script`,
			[
				plugin.name,
				plugin.version,
				plugin.dependencies ?? null,
				plugin.created.getTime(),
				plugin.edited.getTime(),
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
