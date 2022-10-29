import { Dexie } from "dexie"
import { ResourceId } from "../../src/domain/ids"

class DexieDb extends Dexie {
  resources!: Dexie.Table<Resource, string>

  constructor() {
    super("MyAppDatabase")
    this.version(1).stores({
      resources: "name",
    })
  }
}

export interface Resource {
  name: string
  data: ArrayBuffer
}

const ddb = new DexieDb()

export const dexieMethods = {
  async bulkAddResources(resources: Resource[]) {
    await ddb.resources.bulkAdd(resources)
  },
  async getResource(id: ResourceId) {
    return await ddb.resources.get(id)
  },
}
