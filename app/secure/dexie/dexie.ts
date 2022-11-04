import { Dexie } from "dexie"
import { ResourceId } from "../../src/domain/ids"
import { Plugin } from "../../src/domain/plugin"
import { Resource } from "../../src/domain/resource"
import * as Comlink from "comlink"

class DexieDb extends Dexie {
  resources!: Dexie.Table<Resource, string>
  plugins!: Dexie.Table<Plugin, string>

  constructor() {
    super("MyAppDatabase")
    this.version(1).stores({
      resources: "id",
      plugins: "id",
    })
  }
}

const ddb = new DexieDb()

export const dexieMethods = {
  async bulkAddResources(resources: Resource[]) {
    await ddb.resources.bulkAdd(resources)
  },
  async getResource(id: ResourceId) {
    const resource = await ddb.resources.get(id)
    const data = resource?.data ?? undefined
    if (data == null) {
      return data
    } else {
      return Comlink.transfer(resource, [data])
    }
  },
  upsertPlugin: async function (plugin: Plugin) {
    await ddb.plugins.put(plugin)
  },
  getPlugins: async function (): Promise<Plugin[]> {
    return await ddb.plugins.toArray()
  },
}
