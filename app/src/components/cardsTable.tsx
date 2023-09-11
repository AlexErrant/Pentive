import {
	createEffect,
	createSignal,
	on,
	type VoidComponent,
	Show,
	For,
} from 'solid-js'
import { type NoteCard, type CardId } from 'shared'
import '@github/relative-time-element'
import AgGridSolid, { type AgGridSolidRef } from 'ag-grid-solid'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import {
	type ICellRendererParams,
	type ColDef,
	type GetRowIdParams,
	type GridReadyEvent,
	type IGetRowsParams,
} from 'ag-grid-community'
import { LicenseManager } from 'ag-grid-enterprise'
import { db } from '../db'
import { assertNever } from 'shared'
import { agGridTheme } from '../globalState'
import { Upload } from 'shared-dom'
import { C } from '../pluginManager'
import { debounce, leadingAndTrailing } from '@solid-primitives/scheduled'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<NoteCard>> = [
	{ field: 'card.id', hide: true },
	{ field: 'note.id', hide: true },
	{
		headerName: 'Card',
		valueGetter: (x) => {
			if (x.data != null) {
				switch (x.data.template.templateType.tag) {
					case 'standard':
						return x.data.template.templateType.templates.at(x.data.card.ord)
							?.name
					case 'cloze':
						return `Cloze ${x.data.card.ord}`
					default:
						return assertNever(x.data.template.templateType)
				}
			}
		},
	},
	{
		headerName: 'Short Front',
		valueGetter: (x) => {
			if (x.data != null) {
				return C.body(x.data.card, x.data.note, x.data.template, true)?.at(0)
			}
		},
	},
	{
		headerName: 'Short Back',
		valueGetter: (x) => {
			if (x.data != null) {
				return C.body(x.data.card, x.data.note, x.data.template, true)?.at(1)
			}
		},
	},
	{
		headerName: 'Due',
		valueGetter: (x) => x.data?.card.due,
		colId: 'card.due',
		sortable: true,
		cellRenderer: (
			props: ICellRendererParams<NoteCard, NoteCard['card']['due']>,
		) => <relative-time date={props.value} />,
	},
	{
		headerName: 'Created',
		valueGetter: (x) => x.data?.card.created,
		colId: 'card.created',
		sortable: true,
		cellRenderer: (
			props: ICellRendererParams<NoteCard, NoteCard['card']['created']>,
		) => <relative-time date={props.value} />,
	},
	{
		headerName: 'Remotes',
		cellRenderer: (props: ICellRendererParams<NoteCard>) => (
			<Show when={props.data?.note.remotes}>
				<ul>
					<For each={Array.from(props.data!.note.remotes)}>
						{([nook, v]) => (
							<li class='mr-2 inline'>
								<span>
									<Show
										when={v}
										fallback={
											<>
												<Upload class='inline h-[1em]' />
												/n/{nook}
											</>
										}
									>
										<Show
											when={
												v!.uploadDate.getTime() <=
												props.data!.note.updated.getTime()
											}
										>
											<Upload class='inline h-[1em]' />
										</Show>
										<a
											class='text-blue-600 underline visited:text-purple-600 hover:text-blue-800'
											title={`Last uploaded at ${v!.uploadDate.toLocaleString()}`}
											href={
												import.meta.env.VITE_HUB_ORIGIN +
												`/n/` +
												nook +
												`/note/` +
												v!.remoteNoteId
											}
										>
											/n/{nook}
										</a>
									</Show>
								</span>
							</li>
						)}
					</For>
				</ul>
			</Show>
		),
	},
	{
		headerName: 'Tags',
		valueGetter: (x) => Array.from(x.data?.note.tags.keys() ?? []).join(', '),
	},
]

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
	params.data.card.id

const [literalSearch, setLiteralSearch] = createSignal('')
const [ftsSearch, setFtsSearch] = createSignal('')

const debouncedSetDatasource = leadingAndTrailing(
	debounce,
	() => {
		gridRef?.api.setDatasource(dataSource)
	},
	200,
)

const CardsTable: VoidComponent<{
	readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
	createEffect(on(literalSearch, debouncedSetDatasource, { defer: true }))
	createEffect(on(ftsSearch, debouncedSetDatasource, { defer: true }))
	return (
		<div class='flex h-full flex-col'>
			<div class='m-0.5 p-0.5'>
				<input
					class='w-full border'
					type='text'
					placeholder='Literal Search'
					onInput={(e) => setLiteralSearch(e.currentTarget.value)}
				/>
				<input
					class='w-full border'
					type='text'
					placeholder='FTS Search'
					onInput={(e) => setFtsSearch(e.currentTarget.value)}
				/>
			</div>
			<div class={`${agGridTheme()} h-full`}>
				<AgGridSolid
					sideBar={{
						toolPanels: [
							{
								id: 'columns',
								labelDefault: 'Columns',
								labelKey: 'columns',
								iconKey: 'columns',
								toolPanel: 'agColumnsToolPanel',
								toolPanelParams: {
									suppressRowGroups: true,
									suppressValues: true,
									suppressPivotMode: true,
								},
							},
						],
					}}
					columnDefs={columnDefs}
					ref={gridRef}
					defaultColDef={{ resizable: true }}
					getRowId={getRowId}
					rowSelection='multiple'
					rowModelType='infinite'
					onGridReady={onGridReady}
					cacheBlockSize={cacheBlockSize}
					suppressMultiSort={true}
					onSelectionChanged={(event) => {
						const ncs = event.api.getSelectedRows() as NoteCard[]
						props.onSelectionChanged(ncs)
					}}
					onFirstDataRendered={(params) => {
						params.api.sizeColumnsToFit()
					}}
				/>
			</div>
		</div>
	)
}

export default CardsTable

const cacheBlockSize = 100

const onGridReady = ({ api }: GridReadyEvent) => {
	api.setDatasource(dataSource)
}

const dataSource = {
	getRows: (p: IGetRowsParams) => {
		const sort =
			p.sortModel.length === 1
				? {
						col: p.sortModel[0]!.colId as 'card.due' | 'card.created',
						direction: p.sortModel[0]!.sort,
				  }
				: undefined
		const literalSearchActual = literalSearch()
		const ftsSearchActual = ftsSearch()
		const search = {
			literalSearch:
				literalSearchActual.trim() === '' ? undefined : literalSearchActual,
			ftsSearch: ftsSearchActual.trim() === '' ? undefined : ftsSearchActual,
		}
		const start = performance.now()
		db.getCards(p.startRow, cacheBlockSize, sort, search) // medTODO could just cache the Template and mutate the NoteCard obj to add it
			.then((x) => {
				const end = performance.now()
				console.log(`GetCards ${end - start} ms`, search)
				p.successCallback(x.noteCards, x.count)
			})
			.catch(() => {
				p.failCallback()
			})
	},
}
