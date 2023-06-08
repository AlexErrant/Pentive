import { type JSX } from "solid-js"
import PluginsTable from "../components/pluginsTable"
import { db } from "../db"
import { throwExp } from "shared"
import { parsePluginNpmPackage } from "shared-dom"

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
      <PluginsTable />
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
  const plugin = await parsePluginNpmPackage(pluginTgz)
  await db.upsertPlugin({
    ...plugin,
    created: new Date(),
    updated: new Date(),
  })
  console.log("Plugin upserted!")
}
