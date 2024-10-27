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
import { rd, whoAmI } from '../topLevelAwait'
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
import { uploadNotes, uploadTemplates } from '../domain/sync'
import { type NookId } from 'shared/brand'
import { type Template } from 'shared/domain/template'
import { objKeys } from 'shared/utility'
import { type Note } from 'shared/domain/note'
import { NoteNookSync } from '../components/noteSync'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

async function getUploadables() {
	const [newTemplates, editedTemplates, newNotes, editedNotes] =
		await Promise.all([
			db.getNewTemplatesToUploadDom(),
			db.getEditedTemplatesToUploadDom(),
			db.getNewNotesToUploadDom(),
			db.getEditedNotesToUploadDom(),
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
		} else if (params.data.tag === 'note') {
			const remoteNote = params.data.note.remotes[params.data.nook]
			this.dispose = render(
				() =>
					runWithOwner(params.context.owner, () => (
						<NoteNookSync
							template={(params.data as RowNote).template}
							note={(params.data as RowNote).note}
							nook={params.data!.nook}
							remoteNote={remoteNote}
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
	template: Template
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
				{ field: 'tag', enableRowGroup: true },
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
				colIds: ['nook', 'type', 'tag'],
			},
			suppressRowHoverHighlight: true,
			enableCellTextSelection: true,
			rowGroupPanelShow: 'onlyWhenGrouping',
		} satisfies GridOptions<Row> as GridOptions<Row>
		gridApi = createGrid(ref, gridOptions)
	})
	const [uploadables] = createResource(getUploadables)
	createEffect(() => {
		const u = uploadables()
		if (u != null) {
			gridApi.setGridOption('rowData', u)
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
