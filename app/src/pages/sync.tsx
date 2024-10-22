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
	type IHeaderComp,
	type IHeaderParams,
} from 'ag-grid-community2'
import 'ag-grid-community2/styles/ag-grid.css'
import 'ag-grid-community2/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise2'
import { DiffModeToggleGroup } from '../components/diffModeContext'
import { postMedia, uploadTemplates } from '../domain/sync'
import { type NookId } from 'shared/brand'
import { type Template } from 'shared/domain/template'
import { objKeys } from 'shared/utility'
import { type Note } from 'shared/domain/note'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

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

async function getUploadableTemplates() {
	const news = await db.getNewTemplatesToUploadDom()
	const news2 = news.flatMap((template) =>
		objKeys(template.remotes).map(
			(nook) =>
				({
					nook,
					type: 'new' as Type,
					template,
					tag: 'template',
				}) satisfies Row,
		),
	)
	const editeds = await db.getEditedTemplatesToUploadDom()
	const editeds2 = editeds.flatMap((template) =>
		objKeys(template.remotes).map(
			(nook) =>
				({
					nook,
					type: 'edited' as Type,
					template,
					tag: 'template',
				}) satisfies Row,
		),
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
			return
		}
		if (params.data.tag === 'template') {
			const remoteTemplate = params.data.template.remotes[params.data.nook]
			this.dispose = render(
				() =>
					runWithOwner(params.context.owner, () => (
						<TemplateNookSync
							template={(params.data as RowTemplate).template}
							remoteTemplate={remoteTemplate}
							nook={params.data!.nook}
						/>
					)),
				this.eGui,
			)
		}
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

class HeaderRenderer implements IHeaderComp {
	eGui = document.createElement('div')
	dispose!: () => void

	init(params: IHeaderParams) {
		this.dispose = render(
			() =>
				runWithOwner(
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					params.context.owner as Owner,
					() => <DiffModeToggleGroup />,
				),
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
		this.dispose()
	}
}

type Type = 'new' | 'edited'

interface RowTemplate {
	template: Template
	tag: 'template'
}
interface RowNote {
	note: Note
	tag: 'note'
}

type Row = { nook: NookId; type: Type } & (RowTemplate | RowNote)

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
				{ field: 'nook', enableRowGroup: true },
				{ field: 'type', enableRowGroup: true },
				{
					headerName: 'Diff',
					headerComponent: HeaderRenderer,
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
			rowGroupPanelShow: 'onlyWhenGrouping',
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
