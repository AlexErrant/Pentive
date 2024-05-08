import {
	createEffect,
	createSignal,
	on,
	type VoidComponent,
	Show,
	For,
} from 'solid-js'
import { type NoteCard, type CardId, toOneLine } from 'shared'
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
import { Upload, convert, getOk } from 'shared-dom'
import { C } from '../topLevelAwait'
import FiltersTable from './filtersTable'
import './cardsTable.css'
import QueryEditor from './queryEditor'
import { alterQuery } from '../domain/alterQuery'

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
				return getOk(
					C.body(x.data.card, x.data.note, x.data.template, true),
				)?.at(0)
			}
		},
	},
	{
		headerName: 'Short Back',
		valueGetter: (x) => {
			if (x.data != null) {
				return getOk(
					C.body(x.data.card, x.data.note, x.data.template, true),
				)?.at(1)
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

const [query, setQuery] = createSignal('')
const [externalQuery, setExternalQuery] = createSignal('')

function setDatasource() {
	gridRef?.api.setDatasource(dataSource)
}

const CardsTable: VoidComponent<{
	readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
	createEffect(
		on([query], setDatasource, {
			defer: true,
		}),
	)
	return (
		<div class='flex h-full flex-col'>
			<div class='m-0.5 p-0.5'>
				<QueryEditor
					value={query()}
					setValue={setQuery}
					externalValue={externalQuery()}
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
										tagsChanged={(tags) => {
											const q = alterQuery(query(), { tags })
											setQuery(q)
											setExternalQuery(q)
										}}
										templatesChanged={() => {}}
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

// https://stackoverflow.com/a/6969486
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
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
		const cleanedQuery = query().trim()
		const conversionResult = convert(cleanedQuery)
		const regex = () => {
			const firstWord = conversionResult.strings[0] // lowTODO handle multiple words
			if (firstWord == null) return null
			const escapedFirstWord = escapeRegExp(firstWord)
			return new RegExp(
				`(?<left>.{0,20})\\b(?<searchWord>${escapedFirstWord})(?<right>.{0,20})`,
				'si',
			)
		}
		const start = performance.now()
		db.getCards(
			p.startRow,
			cacheBlockSize,
			cleanedQuery,
			conversionResult,
			sort,
		) // medTODO could just cache the Template and mutate the NoteCard obj to add it
			.then(async (x) => {
				const end = performance.now()
				console.log(`GetCards ${end - start} ms`, cleanedQuery)
				const countish = x.noteCards.length
				const countishWrong = countish === cacheBlockSize
				p.successCallback(
					x.noteCards,
					countishWrong || gridRef.api.isLastRowIndexKnown() === true
						? undefined
						: countish,
				)
				if (p.startRow === 0) {
					if (countish === 0) {
						gridRef.api.showNoRowsOverlay()
					} else {
						gridRef.api.hideOverlay()
					}
				}
				setColumnDefs(cleanedQuery, regex())
				if (countishWrong && gridRef.api.isLastRowIndexKnown() !== true) {
					const start = performance.now()
					const count = await db.getCardsCount(x.searchCache, x.baseQuery)
					const end = performance.now()
					console.log(`Count took ${end - start} ms`, cleanedQuery)
					gridRef.api.setRowCount(count.c, true)
				}
				if (countishWrong && x.searchCache == null) {
					// asynchronously/nonblockingly build the cache
					db.buildCache(x.baseQuery(), cleanedQuery).catch((e) => {
						C.toastWarn('Error building cache', e)
					})
				}
			})
			.catch((e) => {
				C.toastError('Error getting cards.', e)
				p.failCallback()
			})
	},
}

function minifyAndExec(value: string, regex: RegExp | null) {
	const minified = value.replace(/\s+/g, ' ')
	if (regex == null) return null
	return regex.exec(minified)
}

function setColumnDefs(ftsSearchActual: string, regex: RegExp | null) {
	if (ftsSearchActual !== '' && gridRef.api.getColumnDef('Search') == null) {
		gridRef.api.setColumnDefs([
			{
				headerName: 'Search',
				pinned: 'left',
				colId: 'Search',
				cellRenderer: (props: ICellRendererParams<NoteCard>) => {
					const [match, setMatch] = createSignal<RegExpExecArray>()
					createEffect(() => {
						for (const v of props.data?.note.fieldValues.values() ?? []) {
							const r = minifyAndExec(toOneLine(v), regex)
							if (r != null) {
								setMatch(r)
								return
							}
						}
						for (const v of props.data?.note.fieldValues.values() ?? []) {
							const r = minifyAndExec(v, regex)
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
									C.toastImpossible('searchWord is missing')}
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
}
