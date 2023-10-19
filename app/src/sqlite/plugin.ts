import { type Plugin } from 'shared-dom'
import { rd, ky } from '../topLevelAwait'
import { type Plugin as PluginEntity } from './database'
import { type PluginName } from 'shared'

function entityToDomain(entity: PluginEntity): Plugin {
	return {
		name: entity.name,
		version: entity.version,
		dependencies: entity.dependencies ?? undefined,
		created: new Date(entity.created),
		updated: new Date(entity.updated),
		script: new Blob([entity.script], {
			type: 'text/javascript',
		}),
	}
}

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
		return plugins.map(entityToDomain)
	},
	deletePlugin: async function (name: PluginName) {
		await ky.deleteFrom('plugin').where('name', '=', name).execute()
	},
}
