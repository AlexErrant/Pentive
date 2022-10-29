import { Dexie } from "dexie"
import { ResourceId } from "../../src/domain/ids"

class DexieDb extends Dexie {
  resources!: Dexie.Table<Resource, string>
  plugins!: Dexie.Table<Plugin, string>

  constructor() {
    super("MyAppDatabase")
    this.version(1).stores({
      resources: "name",
      plugins: "id",
    })
  }
}

export interface Resource {
  name: string
  data: ArrayBuffer
}

interface Plugin {
  readonly name: string
  readonly id: string
  readonly created: string
  readonly modified: string
  readonly script: Blob
}

const ddb = new DexieDb()

export const dexieMethods = {
  async bulkAddResources(resources: Resource[]) {
    await ddb.resources.bulkAdd(resources)
  },
  async getResource(id: ResourceId) {
    return await ddb.resources.get(id)
  },
  upsertPlugin: async function (plugin: Plugin) {
    await ddb.plugins.put(plugin)
  },
  getPlugins: async function (): Promise<Plugin[]> {
    return await ddb.plugins.toArray()
  },
}
