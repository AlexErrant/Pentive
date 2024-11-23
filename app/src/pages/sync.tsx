import {
	createEffect,
	createResource,
	onMount,
	type Owner,
	Show,
	type JSX,
} from 'solid-js'
import Peers from './peers'
import { C, rd } from '../topLevelAwait'
import { TemplateNookSync } from '../components/templateSync'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import {
	type GridOptions,
	type ICellRendererParams,
	type ICellRendererComp,
	type GridApi,
	type IHeaderComp,
	type IHeaderParams,
} from 'ag-grid-community2'
import 'ag-grid-community2/styles/ag-grid.css'
import 'ag-grid-community2/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise2'
import { DiffModeToggleGroup } from '../components/diffModeContext'
import { uploadNotes, uploadTemplates } from '../domain/sync'
import { type NookId } from 'shared/brand'
import { type Template } from 'shared/domain/template'
import { objKeys, type Override } from 'shared/utility'
import { type Note } from 'shared/domain/note'
import { NoteNookSync } from '../components/noteSync'
import { useWhoAmIContext } from '../components/whoAmIContext'
import { createGrid, Renderer } from '../uiLogic/aggrid'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

async function getUploadables() {
	const [newTemplates, editedTemplates, newNotes, editedNotes] =
		await Promise.all([
			C.db.getNewTemplatesToUploadDom(),
			C.db.getEditedTemplatesToUploadDom(),
			C.db.getNewNotesToUploadDom(),
			C.db.getEditedNotesToUploadDom(),
		])
	const newTemplates2 = newTemplates.flatMap((template) =>
		objKeys(template.remotes).map(
			(nook) =>
				({
					nook,
					type: 'new' as const,
					template,
					tag: 'template',
				}) satisfies Row,
		),
	) as Row[]
	const editedTemplates2 = editedTemplates.flatMap((template) =>
		objKeys(template.remotes).map(
			(nook) =>
				({
					nook,
					type: 'edited' as const,
					template,
					tag: 'template',
				}) satisfies Row,
		),
	)
	const newNotes2 = newNotes.flatMap(([template, note]) =>
		objKeys(note.remotes).map(
			(nook) =>
				({
					nook,
					type: 'new' as const,
					note,
					template,
					tag: 'note',
				}) satisfies Row,
		),
	)
	const editedNotes2 = editedNotes.flatMap(([template, note]) =>
		objKeys(note.remotes).map(
			(nook) =>
				({
					nook,
					type: 'edited' as const,
					note,
					template,
					tag: 'note',
				}) satisfies Row,
		),
	)
	newTemplates2.push(...editedTemplates2)
	newTemplates2.push(...newNotes2)
	newTemplates2.push(...editedNotes2)
	return newTemplates2
}

export default function Sync(): JSX.Element {
	const whoAmI = useWhoAmIContext()
	return (
		<Show
			when={whoAmI()}
			fallback={"You can only upload/download/sync when you're logged in."}
		>
			<Content />
		</Show>
	)
}

type Type = 'new' | 'edited'

interface RowTemplate {
	template: Template
	tag: 'template'
}
interface RowNote {
	note: Note
	template: Template
	tag: 'note'
}

export type Row = { nook: NookId; type: Type } & (RowTemplate | RowNote)

interface Context {
	owner: Owner
}

type SyncGridOptions = Override<
	GridOptions<Row>,
	{ context: Record<string, unknown> }
>

export const syncGridOptions = {
	columnDefs: [
		{ field: 'nook', enableRowGroup: true, filter: true },
		{ field: 'type', enableRowGroup: true, filter: true },
		{ field: 'tag', enableRowGroup: true, filter: true },
		{
			headerName: 'Diff',
			headerComponent: class extends Renderer implements IHeaderComp {
				init(params: IHeaderParams<Row, Context>) {
					this.render(params.context.owner, () => <DiffModeToggleGroup />)
				}
			},
			cellRenderer: class extends Renderer implements ICellRendererComp<Row> {
				init(params: ICellRendererParams<Row, unknown, Context>) {
					if (params.data == null) {
						return
					}
					if (params.data.tag === 'template') {
						const remoteTemplate =
							params.data.template.remotes[params.data.nook]
						this.render(params.context.owner, () => (
							<TemplateNookSync
								template={(params.data as RowTemplate).template}
								remoteTemplate={remoteTemplate}
								nook={params.data!.nook}
							/>
						))
					} else if (params.data.tag === 'note') {
						const remoteNote = params.data.note.remotes[params.data.nook]
						this.render(params.context.owner, () => (
							<NoteNookSync
								template={(params.data as RowNote).template}
								note={(params.data as RowNote).note}
								nook={params.data!.nook}
								remoteNote={remoteNote}
							/>
						))
					}
				}
			},
			autoHeight: true,
			flex: 1,
		},
	],
	context: {},
	autoSizeStrategy: {
		type: 'fitCellContents',
		colIds: ['nook', 'type', 'tag'],
	},
	suppressRowHoverHighlight: true,
	enableCellTextSelection: true,
	rowGroupPanelShow: 'onlyWhenGrouping',
} satisfies SyncGridOptions as SyncGridOptions

function Content(): JSX.Element {
	let ref: HTMLDivElement
	let gridApi: GridApi<Row>
	onMount(() => {
		gridApi = createGrid(ref, C.syncGridOptions)
	})
	const [uploadables] = createResource(getUploadables, {
		initialValue: [],
	})
	createEffect(() => {
		gridApi.setGridOption('rowData', uploadables())
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
						await C.db.sync(rd)
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
