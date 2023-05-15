import { type JSX } from "solid-js"
import PluginTable from "../customElements/pluginsTable"
import { db } from "../db"
import { throwExp, type PluginId } from "shared"
import { getPackageJson, ulidAsBase64Url } from "../domain/utility"

export default function Plugins(): JSX.Element {
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Plugin</h1>
      </section>
      <input
        type="file"
        accept=".tgz"
        onChange={async (e) => {
          await importPlugin(e)
        }}
      />
      <PluginTable getPlugins={db.getPlugins} />
    </>
  )
}

async function importPlugin(
  event: Event & {
    currentTarget: HTMLInputElement
    target: HTMLInputElement
  }
) {
  const pluginTgz =
    // My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
    event.target.files?.item(0) ??
    throwExp("Impossible - there should be a file selected")
  const packageJson = await getPackageJson(pluginTgz)
  await db.upsertPlugin({
    id: ulidAsBase64Url() as PluginId,
    created: new Date(),
    updated: new Date(),
    name: packageJson.name,
    script: pluginTgz,
  })
  console.log("Plugin upserted!")
}
