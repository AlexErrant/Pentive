import type { Plugin } from 'shared-dom/plugin'
import { rd, ky, C } from '../topLevelAwait'
import { pluginEntityToDomain } from './util'
import type { PluginName } from 'shared/brand'
import type { SqliteCount } from 'shared/utility'

export const pluginCollectionMethods = {
	async upsertPlugin(plugin: Plugin) {
		const now = C.getDate().getTime()
		await rd.exec(
			`INSERT INTO plugin (name,version,dependencies,created,edited,script)
                   VALUES (   ?,      ?,           ?,      ?,      ?,    ?)
       ON CONFLICT(name) DO UPDATE SET
         version=excluded.version,
         dependencies=excluded.dependencies,
         edited=excluded.edited,
         script=excluded.script`,
			// lowTODO add conflict types via typescript, i.e. "point of this type is to cause an error if something is added to Plugin"
			[
				plugin.name,
				plugin.version,
				plugin.dependencies ?? null,
				now,
				now,
				new Uint8Array(await plugin.script.arrayBuffer()),
			],
		)
	},
	async getPlugins(): Promise<Plugin[]> {
		const plugins = await ky.selectFrom('plugin').selectAll().execute()
		return plugins.map(pluginEntityToDomain)
	},
	async getPluginCount() {
		const plugins = await ky
			.selectFrom('plugin')
			.select(ky.fn.count<SqliteCount>('name').as('c'))
			.executeTakeFirstOrThrow()
		return plugins.c
	},
	async deletePlugin(name: PluginName) {
		await ky.deleteFrom('plugin').where('name', '=', name).execute()
	},
}
