import { useRouteData } from '@solidjs/router'
import {
	createEffect,
	createSignal,
	type VoidComponent,
	type JSX,
	type Setter,
} from 'solid-js'
import { type MediaId } from 'shared'
import type HomeData from './home.data'
import { db } from '../db'
import { importAnki } from './importer/importer'
import { augcClient } from '../trpcClient'
import { getDb } from '../sqlite/crsqlite'
import { C } from '../pluginManager'
import { toastImpossible } from '../components/toasts'
import EditSql from '../components/editSql'

async function searchNotes(search: string): Promise<void> {
	const searchBatch = await augcClient.searchNotes.query(search)
	console.log(searchBatch)
}

const MyPluginBaby: VoidComponent<{
	count: number
	setCount: Setter<number>
}> = (props) => {
	return (
		<div class='border-gray-900 m-1 rounded-lg border p-1'>
			<h1>App's Child Component</h1>
			<button
				class='border-gray-900 mx-2 rounded-lg border px-2'
				onClick={() => props.setCount(props.count - 1)}
			>
				-
			</button>
			<output>Negative Count: {props.count * -1}</output>
			<button
				class='border-gray-900 mx-2 rounded-lg border px-2'
				onClick={() => props.setCount(props.count + 1)}
			>
				+
			</button>
		</div>
	)
}

export default function Home(): JSX.Element {
	const [count, setCount] = createSignal(1)
	const [search, setSearch] = createSignal('')
	const age = useRouteData<typeof HomeData>()

	createEffect(() => {
		console.log(age())
		setCount(age() as number) // not sure why, but changing to a mono repo changed the signature of this to include `undefined` - which is wrong. Whatever.
	})

	return (
		<section class='text-gray-700 bg-gray-100 p-8'>
			<h1 class='text-2xl font-bold'>Home</h1>
			<p class='mt-4'>This is the home page.</p>

			<div class='flex items-center space-x-2'>
				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={() => setCount(count() - 1)}
				>
					-
				</button>

				<output class='p-10px'>Count: {count()}</output>

				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={() => setCount(count() + 1)}
				>
					+
				</button>
			</div>
			<div class='flex items-center space-x-2'>
				<C.examplePlugin
					count={count()}
					setCount={setCount}
					child={MyPluginBaby}
				/>
			</div>
			<div class='mt-4'>
				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={async () => {
						await searchNotes(search())
					}}
				>
					searchNotes
				</button>
				<form
					onSubmit={async (e) => {
						e.preventDefault()
						await searchNotes(search())
					}}
				>
					<input
						class='w-75px bg-white form-input rounded-lg p-1 text-sm'
						type='text'
						onInput={(e) => setSearch(e.currentTarget.value)}
					/>
				</form>
			</div>
			<div class='mt-4'>
				<label>
					Import Anki apkg
					<input type='file' onChange={importAnki} accept='.apkg' />
				</label>
			</div>
			<div class='mt-4'>
				<label>
					Upload Media
					<input type='file' onChange={uploadMedia} accept='image/*' />
				</label>
			</div>
			<div class='mt-4'>
				<EditSql
					// eslint-disable-next-line solid/reactivity -- it's reactive for up to 1 await
					run={async (x) => {
						await q(x)()
					}}
				/>
				<button class='px-2' onClick={q('select * from template')}>
					template
				</button>
				<button class='px-2' onClick={q('select * from remoteTemplate')}>
					remoteTemplate
				</button>
				<button class='px-2' onClick={q('select * from remoteNote')}>
					remoteNote
				</button>
				<button class='px-2' onClick={q('select * from remoteMedia')}>
					remoteMedia
				</button>
				<button
					class='px-2'
					onClick={q(
						'select hash, count(*) c from media group by hash having c > 1',
					)}
				>
					dupMedia
					{/* medTODO add de-duping of media using their hash. Implement after adding full text search, since we'll need to search existing notes for images using dupes. */}
				</button>
			</div>
		</section>
	)
}

function q(rawSql: string) {
	return async () => {
		console.log(rawSql)
		const start = performance.now()
		const r = await (await getDb()).execO(rawSql)
		const end = performance.now()
		console.table(r)
		console.log(`Execution time: ${end - start} ms`)
	}
}

async function uploadMedia(
	event: Event & {
		currentTarget: HTMLInputElement
		target: HTMLInputElement
	},
): Promise<void> {
	const file =
		// My mental static analysis says to use `currentTarget`, but it seems to randomly be null, hence `target`. I'm confused but whatever.
		event.target.files?.item(0) ??
		toastImpossible('There should be a file selected')
	await db.bulkInsertMedia([
		{
			id: file.name as MediaId,
			created: new Date(),
			updated: new Date(),
			data: await file.arrayBuffer(),
		},
	])
}
