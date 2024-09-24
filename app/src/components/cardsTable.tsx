import {
	createEffect,
	createSignal,
	on,
	type VoidComponent,
	Show,
	For,
	createMemo,
	type Accessor,
} from 'solid-js'
import { type NoteCard, type CardId, throwExp } from 'shared'
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
import { Upload, Hamburger } from 'shared-dom/icons'
import { getOk } from 'shared-dom/cardHtml'
import {
	convert,
	unique,
	type FieldValueHighlight,
} from 'shared-dom/language/query2sql'
import { C } from '../topLevelAwait'
import FiltersTable from './filtersTable'
import './cardsTable.css'
import QueryEditor from './queryEditor'
import { alterQuery } from '../domain/alterQuery'
import CardsTableHelp from './cardsTableHelp'
import { type Sort } from '../sqlite/card'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef
const [fvHighlight, setFvHighlight] = createSignal<
	FieldValueHighlight[] | undefined
>()

interface SearchText {
	isHighlight: boolean
	text: string
}
const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })

// cSpell:ignore fvhs imsx mindfuck
const regexCtor = (fvhs: FieldValueHighlight[] | undefined, global?: true) => {
	if (fvhs == null || fvhs.length === 0) return null
	return new RegExp(
		fvhs.map((fvh) => fvh.pattern).join('|'), // pipe has lowest precedence so this *should* work
		// The `g` flag introduces state to methods like `test` which WILL mindfuck you.
		// Only `regex()` needs `g` for `matchAll`, but be forewarned in case you make changes.
		unique(fvhs.map((x) => x.flags).join('') + (global ? 'g' : '')), // regex flag 31C731B0-41F5-46A5-93B4-D00D9A6064EA
		// lowTODO use (?imsx-imsx:subexpression) once webkit supports https://github.com/tc39/proposal-regexp-modifiers
		// Alternatively make an array of regex, build a list of the indexes of their match ranges, and then finally build the SearchText list.
		// FYI <mark> can overlap. Could also maybe use https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API
	)
}

const shortRenderer = (index: number, props: ICellRendererParams<NoteCard>) => {
	const { regex, regexLeft, regexRight, regexBoth } = props.context as Regexes
	const short = () => {
		if (props.data == null) {
			return ''
		} else {
			const short = getOk(
				C.body(props.data.card, props.data.note, props.data.template, true),
			)?.at(index)
			if (short == null) return ''
			const fvh = fvHighlight()
			if (fvh == null || fvh.length === 0) return short
			const segments = Array.from(segmenter.segment(short))
			const r: SearchText[] = []
			let i = 0
			const rl = regexLeft()
			const rr = regexRight()
			const rb = regexBoth()
			for (const match of short.matchAll(regex())) {
				if (match.index !== i) {
					r.push({ isHighlight: false, text: short.slice(i, match.index) })
				}
				const text = match[0]
				if (rl == null && rr == null && rb == null) {
					r.push({ isHighlight: true, text })
				} else {
					const left = segments.some((s) => s.index === match.index)
					const right = segments.some(
						(s) => s.index + s.segment.length === match.index + text.length,
					)
					if (rb?.test(text) === true) {
						r.push({ isHighlight: left && right, text })
					} else if (rl?.test(text) === true) {
						r.push({ isHighlight: left, text })
					} else if (rr?.test(text) === true) {
						r.push({ isHighlight: right, text })
					} else {
						throwExp('impossible')
					}
				}
				i = match.index + text.length
			}
			if (i !== short.length) {
				r.push({ isHighlight: false, text: short.slice(i) })
			}
			return r
		}
	}
	return (
		<Show
			when={typeof short() === 'string'}
			fallback={
				<For each={short() as SearchText[]}>
					{(x) => (
						<Show when={x.isHighlight} fallback={x.text}>
							<mark>{x.text}</mark>
						</Show>
					)}
				</For>
			}
		>
			{short() as string}
		</Show>
	)
}

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
		cellRenderer: (x: ICellRendererParams<NoteCard>) => shortRenderer(0, x),
		cellClass: ['has-[mark]:bg-yellow-50'],
	},
	{
		headerName: 'Short Back',
		cellRenderer: (x: ICellRendererParams<NoteCard>) => shortRenderer(1, x),
		cellClass: ['has-[mark]:bg-yellow-50'],
	},
	{
		headerName: 'Due',
		valueGetter: (x) => x.data?.card.due,
		colId: 'card.due',
		sortable: true,
		cellRenderer: (
			props: ICellRendererParams<NoteCard, NoteCard['card']['due']>,
		) => (
			<>
				{typeof props.value === 'number' ? (
					<>New #{props.value}</>
				) : (
					<relative-time date={props.value} />
				)}
			</>
		),
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
												props.data!.note.edited.getTime()
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
		valueGetter: (x) =>
			Array.from(x.data?.card.tags.keys() ?? [])
				.concat(Array.from(x.data?.note.tags.keys() ?? []))
				.join(', '),
	},
]

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
	params.data.card.id

const [query, setQuery] = createSignal('')
const [externalQuery, setExternalQuery] = createSignal('')
const [count, setCount] = createSignal<number>()
const [selectedCount, setSelectedCount] = createSignal<number>(0)
const [showHelp, setHelp] = createSignal(false)

function setDatasource() {
	setCount(undefined)
	gridRef?.api.setDatasource(dataSource)
}

interface Regexes {
	regex: Accessor<RegExp>
	regexLeft: Accessor<RegExp | null>
	regexRight: Accessor<RegExp | null>
	regexBoth: Accessor<RegExp | null>
}

const CardsTable: VoidComponent<{
	readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
	createEffect(
		on([query], setDatasource, {
			defer: true,
		}),
	)
	const regex = createMemo(() => regexCtor(fvHighlight(), true)!)
	const regexLeft = createMemo(() =>
		regexCtor(fvHighlight()?.filter((f) => f.boundLeft)),
	)
	const regexRight = createMemo(() =>
		regexCtor(fvHighlight()?.filter((f) => f.boundRight)),
	)
	const regexBoth = createMemo(() =>
		regexCtor(fvHighlight()?.filter((f) => f.boundRight && f.boundLeft)),
	)
	const regexes = {
		regex,
		regexLeft,
		regexRight,
		regexBoth,
	} satisfies Regexes
	const [theme] = useThemeContext()
	return (
		<div class='flex h-full flex-col'>
			{showHelp() && <CardsTableHelp />}
			<div class='m-0.5 flex flex-row items-center gap-2 p-0.5'>
				<QueryEditor
					value={query()}
					setValue={setQuery}
					externalValue={externalQuery()}
				/>
				{selectedCount() === 0 || selectedCount() === 1
					? ''
					: selectedCount() + '/'}
				{count() ?? '⏳'}
				<Hamburger class='w-6' onclick={() => setHelp((x) => !x)} />
			</div>
			<div class={`${agGridTheme(theme)} h-full`}>
				<AgGridSolid
					context={regexes}
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
						setSelectedCount(ncs.length)
						props.onSelectionChanged(ncs)
					}}
					navigateToNextCell={(p) => {
						if (p.key === 'ArrowUp' || p.key === 'ArrowDown') {
							const i = p.previousCellPosition.rowIndex
							const i2 = p.key === 'ArrowUp' ? i - 1 : i + 1
							const shift = p.event?.shiftKey ?? false
							const alt = p.event?.altKey ?? false
							p.api.forEachNode((node) => {
								if (i2 === node.rowIndex) {
									node.setSelected(true, !shift && !alt)
								} else if (!shift && i === node.rowIndex) {
									node.setSelected(false)
								}
							})
						}
						return p.nextCellPosition
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
				? ({
						col: p.sortModel[0]!.colId as 'card.due' | 'card.created',
						direction: p.sortModel[0]!.sort,
					} satisfies Sort)
				: undefined
		const cleanedQuery = query().trim()
		const now = C.getDate()
		const conversionResult = convert(cleanedQuery, now)
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
				// cSpell:ignore countish
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
				setFvHighlight(x.fieldValueHighlight)
				if (countishWrong && gridRef.api.isLastRowIndexKnown() !== true) {
					const start = performance.now()
					const count = await db.getCardsCount(x.searchCache, x.baseQuery)
					const end = performance.now()
					console.log(`Count took ${end - start} ms`, cleanedQuery)
					gridRef.api.setRowCount(count.c, true)
					setCount(count.c)
				} else if (!countishWrong) {
					setCount(countish)
				}
				if (countishWrong && x.searchCache == null) {
					// asynchronously/nonblockingly build the cache
					db.buildCache(x.baseQuery(), cleanedQuery, sort).catch((e) => {
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
