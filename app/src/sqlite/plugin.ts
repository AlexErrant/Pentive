import { type Plugin } from "shared-dom"
import { getDb, getKysely } from "./crsqlite"
import { type Plugin as PluginEntity } from "./database"
import { type PluginName } from "shared"

function entityToDomain(entity: PluginEntity): Plugin {
  return {
    name: entity.name,
    version: entity.version,
    dependencies: entity.dependencies ?? undefined,
    created: new Date(entity.created),
    updated: new Date(entity.updated),
    script: new Blob([entity.script], {
      type: "text/javascript",
    }),
  }
}

export const pluginCollectionMethods = {
  upsertPlugin: async function (plugin: Plugin) {
    const db = await getDb()
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
      ]
    )
  },
  getPlugins: async function (): Promise<Plugin[]> {
    const db = await getKysely()
    const plugins = await db.selectFrom("plugin").selectAll().execute()
    return plugins.map(entityToDomain)
  },
  deletePlugin: async function (name: PluginName) {
    const db = await getKysely()
    await db.deleteFrom("plugin").where("name", "=", name).execute()
  },
}
