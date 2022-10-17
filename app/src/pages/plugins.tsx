import { JSX } from "solid-js"
import PluginTable from "../custom-elements/pluginsTable"
import { db } from "../messenger"
import { Plugin } from "../../src/domain/plugin"

export default function Plugins(): JSX.Element {
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Plugin</h1>
      </section>
      <input
        type="file"
        accept=".js"
        onChange={async (e) => {
          const target = e.target as HTMLInputElement // https://github.com/microsoft/TypeScript/issues/31816
          const plugin: Plugin = {
            id: "520E5C04-93DF-4DB8-B51A-0B5EAE843356",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            name: "plain pentive nav",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            script: target.files![0],
          }
          await db.upsertPlugin(plugin)
        }}
      />
      <PluginTable getPlugins={db.getPlugins} />
    </>
  )
}
