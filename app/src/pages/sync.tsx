import {
	createEffect,
	createResource,
	getOwner,
	onMount,
	type Owner,
	Show,
	type JSX,
	runWithOwner,
} from 'solid-js'
import { render } from 'solid-js/web'
import { db } from '../db'
import Peers from './peers'
import {
	type MediaId,
	type Base64Url,
	type RemoteMediaNum,
	csrfHeaderName,
	type NookId,
	type Template,
	objKeys,
	throwExp,
} from 'shared'
import { cwaClient } from '../trpcClient'
import { C, rd, whoAmI } from '../topLevelAwait'
import { TemplateNookSync } from '../components/templateSync'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import {
	type GridOptions,
	type ICellRendererParams,
	createGrid,
	type ICellRendererComp,
	type GridApi,
} from 'ag-grid-community2'
import 'ag-grid-community2/styles/ag-grid.css'
import 'ag-grid-community2/styles/ag-theme-alpine.css'

async function postMedia(
	type: 'note' | 'template',
	mediaId: MediaId,
	ids: Array<[Base64Url, Base64Url, RemoteMediaNum]>, // localId, remoteId, i
	data: ArrayBuffer,
): Promise<void> {
	const remoteEntityIdAndRemoteMediaNum = ids.map(
		([, remoteEntityId, remoteMediaNum]) => [
			remoteEntityId,
			remoteMediaNum.toString(),
		],
	)
	const response = await fetch(
		import.meta.env.VITE_CWA_URL +
			`media/${type}?` +
			new URLSearchParams(remoteEntityIdAndRemoteMediaNum).toString(),
		{
			method: 'POST',
			body: data,
			credentials: 'include',
			headers: new Headers({
				[csrfHeaderName]: '',
			}),
		},
	)
	// eslint-disable-next-line yoda
	if (200 <= response.status && response.status <= 299) {
		await db.updateUploadDate(ids)
	} else {
		C.toastError(
			`'${response.status}' HTTP status while uploading media with id ${mediaId}.`,
		)
	}
}

async function uploadNotes(): Promise<void> {
	const newNotes = await db.getNewNotesToUpload()
	if (newNotes.length > 0) {
		const remoteIdByLocal = await cwaClient.createNote.mutate(newNotes)
		await db.updateNoteRemoteIds(remoteIdByLocal)
	}
	const editedNotes = await db.getEditedNotesToUpload()
	if (editedNotes.length > 0) {
		await cwaClient.editNote.mutate(editedNotes)
		await db.markNoteAsPushed(
			editedNotes.flatMap((n) => Array.from(n.remoteIds.keys())),
		)
	}
	const media = await db.getNoteMediaToUpload()
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('note', mediaId, ids, data)
	}
	if (editedNotes.length === 0 && newNotes.length === 0 && media.size === 0) {
		C.toastInfo('Nothing to upload!')
	}
}

async function uploadTemplates(): Promise<void> {
	const media = await db.getTemplateMediaToUpload()
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('template', mediaId, ids, data)
	}
	const newTemplates = await db.getNewTemplatesToUpload()
	if (newTemplates.length > 0) {
		const remoteIdByLocal = await cwaClient.createTemplates.mutate(newTemplates)
		await db.updateTemplateRemoteIds(remoteIdByLocal)
	}
	const editedTemplates = await db.getEditedTemplatesToUpload()
	if (editedTemplates.length > 0) {
		await cwaClient.editTemplates.mutate(editedTemplates)
		await db.markTemplateAsPushed(editedTemplates.flatMap((n) => n.remoteIds))
	}
	if (
		editedTemplates.length === 0 &&
		newTemplates.length === 0 &&
		media.size === 0
	) {
		C.toastInfo('Nothing to upload!')
	}
}

async function getUploadableTemplates() {
	const news = await db.getNewTemplatesToUploadDom()
	const news2 = news.flatMap((template) =>
		objKeys(template.remotes).map((nook) => ({
			nook,
			type: 'new' as Type,
			template,
		})),
	)
	const editeds = await db.getEditedTemplatesToUploadDom()
	const editeds2 = editeds.flatMap((template) =>
		objKeys(template.remotes).map((nook) => ({
			nook,
			type: 'edited' as Type,
			template,
		})),
	)
	news2.push(...editeds2)
	return news2
}

export default function Sync(): JSX.Element {
	return (
		<Show
			when={whoAmI()}
			fallback={"You can only upload/download/sync when you're logged in."}
		>
			<Content />
		</Show>
	)
}

class CellRenderer implements ICellRendererComp<Row> {
	eGui = document.createElement('div')
	dispose: (() => void) | undefined

	init(params: ICellRendererParams<Row, unknown, Context>) {
		if (params.data == null) {
			this.eGui.textContent = 'N/A'
			return
		}
		const remoteTemplate =
			params.data.template.remotes[params.data.nook] ?? throwExp()
		this.dispose = render(
			() =>
				runWithOwner(params.context.owner, () => (
					<TemplateNookSync
						template={params.data!.template}
						remoteTemplate={remoteTemplate}
					/>
				)),
			this.eGui,
		)
	}

	getGui() {
		return this.eGui
	}

	refresh() {
		return false
	}

	destroy() {
		if (this.dispose != null) {
			this.dispose()
		}
	}
}

type Type = 'new' | 'edited'

interface Row {
	nook: NookId
	type: Type
	template: Template
}

interface Context {
	owner: Owner
}

function Content(): JSX.Element {
	let ref: HTMLDivElement
	let gridApi: GridApi<Row>
	const owner = getOwner()!
	onMount(() => {
		const gridOptions = {
			columnDefs: [
				{ field: 'nook' },
				{ field: 'type' },
				{
					headerName: 'Diff',
					cellRenderer: CellRenderer,
					autoHeight: true,
					flex: 1,
				},
			],
			context: {
				owner,
			} satisfies Context,
			autoSizeStrategy: {
				type: 'fitCellContents',
				colIds: ['nook', 'type'],
			},
			suppressRowHoverHighlight: true,
			enableCellTextSelection: true,
		} satisfies GridOptions<Row> as GridOptions<Row>
		gridApi = createGrid(ref, gridOptions)
	})
	const [remoteTemplate] = createResource(getUploadableTemplates)
	createEffect(() => {
		const t = remoteTemplate()
		if (t != null) {
			gridApi.setGridOption('rowData', t)
		}
	})
	const [theme] = useThemeContext()
	return (
		<>
			<div class={`${agGridTheme(theme)} h-full`} ref={ref!} />
			<div class='mt-4'>
				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={async () => {
						await uploadTemplates()
					}}
				>
					upload Templates
				</button>
				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={async () => {
						await uploadNotes()
					}}
				>
					upload Notes
				</button>
				<button
					class='border-gray-900 rounded-lg border px-2'
					onClick={async () => {
						await db.sync(rd)
					}}
				>
					p2p sync
				</button>
			</div>
			<div class='mt-4'>
				<Peers />
			</div>
		</>
	)
}
