import { JSX } from "solid-js"
import PluginTable from "../custom-elements/pluginsTable"
import { db } from "../messenger"

export default function Plugins(): JSX.Element {
  return (
    <>
      <section class="bg-pink-100 text-gray-700 p-8">
        <h1 class="text-2xl font-bold">Plugin</h1>
      </section>
      <PluginTable getPlugins={db.getPlugins} />
    </>
  )
}
