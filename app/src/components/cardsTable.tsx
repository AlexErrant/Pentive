import {
	createEffect,
	createSignal,
	on,
	type VoidComponent,
	Show,
	For,
} from 'solid-js'
import { type NoteCard, type CardId, type TemplateId } from 'shared'
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
import { Upload, escapeRegExp } from 'shared-dom'
import { C } from '../pluginManager'
import { strip } from '../domain/utility'
import { toastImpossible } from './toasts'
import FiltersTable from './filtersTable'
import './cardsTable.css'

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
const [tagSearch, setTagSearch] = createSignal<string[]>([])
const [templateSearch, setTemplateSearch] = createSignal<TemplateId[]>([])

function setDatasource() {
	gridRef?.api.setDatasource(dataSource)
}

const CardsTable: VoidComponent<{
	readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
	createEffect(on(literalSearch, setDatasource, { defer: true }))
	createEffect(on(ftsSearch, setDatasource, { defer: true }))
	createEffect(on(tagSearch, setDatasource, { defer: true }))
	createEffect(on(templateSearch, setDatasource, { defer: true }))
	return (
		<div class='flex h-full flex-col'>
			<div class='m-0.5 p-0.5'>
				<input
					class='form-input w-full border'
					type='text'
					placeholder='Literal Search'
					onKeyUp={(e) => {
						if (e.key === 'Enter') setLiteralSearch(e.currentTarget.value)
					}}
				/>
				<input
					class='form-input w-full border'
					type='text'
					placeholder='FTS Search'
					onKeyUp={(e) => {
						if (e.key === 'Enter') setFtsSearch(e.currentTarget.value)
					}}
				/>
			</div>
			<div class={`${agGridTheme()} h-full`}>
				<AgGridSolid
					sideBar={{
						position: 'left',
						defaultToolPanel: 'filters',
						toolPanels: [
							{
								id: 'filters',
								labelDefault: 'Filters',
								labelKey: 'filters',
								iconKey: 'filter',
								toolPanel: () => (
									<FiltersTable
										tagsChanged={setTagSearch}
										templatesChanged={setTemplateSearch}
									/>
								),
							},
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
					onGridSizeChanged={() => {
						gridRef?.api.sizeColumnsToFit()
					}}
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
		const ftsSearchActual = ftsSearch().trim()
		const tagSearchActual = tagSearch()
		const templateSearchActual = templateSearch()
		const search = {
			literalSearch:
				literalSearchActual.trim() === '' ? undefined : literalSearchActual,
			ftsSearch: ftsSearchActual === '' ? undefined : ftsSearchActual,
			tagSearch: tagSearchActual.length === 0 ? undefined : tagSearchActual,
			templateSearch:
				templateSearchActual.length === 0 ? undefined : templateSearchActual,
		}
		const regex = () => {
			const firstWord = ftsSearch().trim().split(' ')[0]! // lowTODO handle multiple words
			const escapedFirstWord = escapeRegExp(firstWord)
			return new RegExp(
				`(?<left>.{0,20})\\b(?<searchWord>${escapedFirstWord})(?<right>.{0,20})`,
				'si',
			)
		}
		const start = performance.now()
		db.getCards(p.startRow, cacheBlockSize, sort, search) // medTODO could just cache the Template and mutate the NoteCard obj to add it
			.then((x) => {
				const end = performance.now()
				console.log(`GetCards ${end - start} ms`, search)
				p.successCallback(x.noteCards, x.count)
				if (
					ftsSearchActual !== '' &&
					gridRef.api.getColumnDef('Search') == null
				) {
					gridRef.api.setColumnDefs([
						{
							headerName: 'Search',
							pinned: 'left',
							colId: 'Search',
							cellRenderer: (props: ICellRendererParams<NoteCard>) => {
								const [match, setMatch] = createSignal<RegExpExecArray>()
								createEffect(() => {
									for (const v of props.data?.note.fieldValues.values() ?? []) {
										const r = minifyAndExec(strip(v), regex())
										if (r != null) {
											setMatch(r)
											return
										}
									}
									for (const v of props.data?.note.fieldValues.values() ?? []) {
										const r = minifyAndExec(v, regex())
										if (r != null) {
											setMatch(r)
											return
										}
									}
								})
								return (
									<Show when={match()}>
										<span>{match()?.groups?.left ?? ''}</span>
										<mark>
											{/* use the match's casing - not the search's (firstWord) */}
											{match()?.groups?.searchWord ??
												toastImpossible('searchWord is missing')}
										</mark>
										<span>{match()?.groups?.right ?? ''}</span>
									</Show>
								)
							},
						} satisfies ColDef<NoteCard>,
						...columnDefs,
					])
				} else if (
					ftsSearchActual === '' &&
					gridRef.api.getColumnDef('Search') != null
				) {
					gridRef.api.setColumnDefs(columnDefs)
				}
			})
			.catch(() => {
				p.failCallback()
			})
	},
}

function minifyAndExec(value: string, regex: RegExp) {
	const minified = value.replace(/\s+/g, ' ')
	return regex.exec(minified)
}
