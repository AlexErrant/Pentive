import { KeyFunctionMap, RxCollection, RxDocument } from "rxdb"
import { getDb } from "./rxdb"
import { PluginDocType } from "./plugin.schema"
import { Plugin } from "../../src/domain/plugin"

interface PluginDocMethods extends KeyFunctionMap {}

export type PluginDocument = RxDocument<PluginDocType, PluginDocMethods>

export type PluginCollection = RxCollection<PluginDocType, PluginDocMethods>

export const pluginDocMethods: PluginDocMethods = {}

export const pluginCollectionMethods = {
  upsertPlugin: async function ({ script, ...plugin }: Plugin) {
    const db = await getDb()
    const upserted = await db.plugins.upsert(plugin)
    await upserted.putAttachment({
      id: "main.js",
      type: "text/javascript",
      data: script,
    })
  },
  getPlugins: async function (): Promise<Plugin[]> {
    const db = await getDb()
    const allPlugins = await db.plugins.find().exec()
    const r = allPlugins.map(async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const script = await p.getAttachment("main.js")!.getData()
      return {
        id: p.id,
        name: p.name,
        created: p.created,
        modified: p.modified,
        script: script as Blob,
      }
    })
    return await Promise.all(r)
  },
}
