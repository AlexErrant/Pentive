import { Dexie } from "dexie"
import { MediaId } from "../../src/domain/ids"
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
  async getResource(id: MediaId) {
    // This helps detect memory leaks - if you see this log 100x, something's very wrong.
    console.debug("getResource for " + id)
    // highTODO perf is abysmal https://stackoverflow.com/q/20809832
    // Consider using Origin Private File System once it's on Android Chrome https://chromestatus.com/feature/5079634203377664 https://bugs.chromium.org/p/chromium/issues/detail?id=1011535#c9
    const resource = await ddb.resources.get(id)
    const data = resource?.data ?? undefined
    if (data == null) {
      return data
    } else {
      return Comlink.transfer(resource, [data])
    }
  },
}
