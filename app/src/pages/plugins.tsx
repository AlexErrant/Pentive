import { type JSX } from 'solid-js'
import PluginsTable from '../components/pluginsTable'
import { db } from '../db'
import { parsePluginNpmPackage } from 'shared-dom'
import { C } from '../topLevelAwait'

export default function Plugins(): JSX.Element {
	return (
		<>
			<input
				type='file'
				accept='.tgz'
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
	},
) {
	const pluginTgz =
		// My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
		event.target.files?.item(0) ??
		C.toastImpossible('There should be a file selected')
	const plugin = await parsePluginNpmPackage(pluginTgz)
	const now = C.getDate()
	await db.upsertPlugin({
		...plugin,
		created: now,
		updated: now,
	})
	C.toastInfo('Plugin upserted!')
}
