import { Plugin } from "../domain/plugin.js"
import { getDb, getKysely } from "./crsqlite.js"
import { Plugin as PluginEntity } from "./database.js"

function entityToDomain(entity: PluginEntity): Plugin {
  return {
    id: entity.id,
    name: entity.name,
    created: new Date(entity.created),
    modified: new Date(entity.modified),
    script: new Blob([entity.script], {
      type: "text/javascript",
    }),
  }
}

export const pluginCollectionMethods = {
  upsertPlugin: async function (plugin: Plugin) {
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO plugin (id,name,created,modified,script)
                   VALUES ( ?,   ?,      ?,        ?,    ?)`
    )
    await insert.run(
      plugin.id,
      plugin.name,
      plugin.created.getTime(),
      plugin.modified.getTime(),
      new Uint8Array(await plugin.script.arrayBuffer())
    )
    insert.finalize()
  },
  getPlugins: async function (): Promise<Plugin[]> {
    const db = await getKysely()
    const plugins = await db.selectFrom("plugin").selectAll().execute()
    return plugins.map(entityToDomain)
  },
}
