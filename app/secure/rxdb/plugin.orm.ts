import { KeyFunctionMap, RxCollection, RxDocument } from "rxdb"
import { getDb } from "./rxdb"
import { PluginDocType } from "./plugin.schema"
import { Plugin } from "../../src/domain/plugin"
import { throwExp } from "../../src/domain/utility"

interface PluginDocMethods extends KeyFunctionMap {}

export type PluginDocument = RxDocument<PluginDocType, PluginDocMethods>

export type PluginCollection = RxCollection<PluginDocType, PluginDocMethods>

export const pluginDocMethods: PluginDocMethods = {}

const attachmentId = "main.js"

export const pluginCollectionMethods = {
  upsertPlugin: async function ({ script, ...plugin }: Plugin) {
    const db = await getDb()
    const upserted = await db.plugins.upsert(plugin)
    await upserted.putAttachment({
      id: attachmentId,
      type: "text/javascript",
      data: script,
    })
  },
  getPlugins: async function (): Promise<Plugin[]> {
    const db = await getDb()
    const allPlugins = await db.plugins.find().exec()
    const r = allPlugins.map(async (p) => {
      const script =
        (await p.getAttachment(attachmentId)?.getData()) ??
        throwExp("Impossible, unless attachmentId got screwed up")
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
