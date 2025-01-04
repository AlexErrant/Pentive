import {
	createEffect,
	createSignal,
	on,
	type VoidComponent,
	Show,
	For,
	createMemo,
	type Accessor,
	type Owner,
	onMount,
} from 'solid-js'
import '@github/relative-time-element'
import {
	type GridOptions,
	type ICellRendererParams,
	type ICellRendererComp,
	type GridApi,
	type NavigateToNextCellParams,
	type IGetRowsParams,
	type IToolPanelComp,
	type IToolPanelParams,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise'
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
import { type NoteCard } from 'shared/domain/card'
import { throwExp, assertNever, type Override } from 'shared/utility'
import { Entries } from '@solid-primitives/keyed'
import { createGrid, registerGridUpdate, Renderer } from '../uiLogic/aggrid'
import { useTableCountContext } from './tableCountContext'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

const cacheBlockSize = 100

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

const shortRenderer = (
	index: number,
	props: ICellRendererParams<NoteCard, unknown, Context>,
) => {
	const { regex, regexLeft, regexRight, regexBoth } = props.context.regexes
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
						throwExp()
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

interface Context {
	owner: Owner
	regexes: Regexes
}

type CardGridOptions = Override<
	GridOptions<NoteCard>,
	{ context: Record<string, unknown> }
>

export const cardGridOptions = {
	columnDefs: [
		{ field: 'card.id', hide: true },
		{ field: 'note.id', hide: true },
		{
			colId: 'Card',
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
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<NoteCard>
			{
				init(params: ICellRendererParams<NoteCard, unknown, Context>) {
					this.render(params.context.owner, () => shortRenderer(0, params))
				}
			},
			cellClass: ['has-[mark]:bg-yellow-50'],
			flex: 2,
		},
		{
			headerName: 'Short Back',
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<NoteCard>
			{
				init(params: ICellRendererParams<NoteCard, unknown, Context>) {
					this.render(params.context.owner, () => shortRenderer(1, params))
				}
			},
			cellClass: ['has-[mark]:bg-yellow-50'],
			flex: 1,
		},
		{
			headerName: 'Due',
			colId: 'card.due',
			sortable: true,
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<NoteCard>
			{
				init(params: ICellRendererParams<NoteCard, unknown, Context>) {
					this.render(params.context.owner, () => (
						<>
							{typeof params.data?.card.due === 'number' ? (
								<>New #{params.data?.card.due}</>
							) : (
								<relative-time prop:date={params.data?.card.due} />
							)}
						</>
					))
				}
			},
		},
		{
			headerName: 'Created',
			colId: 'card.created',
			sortable: true,
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<NoteCard>
			{
				init(params: ICellRendererParams<NoteCard, unknown, Context>) {
					this.render(params.context.owner, () => (
						<relative-time prop:date={params.data?.card.created} />
					))
				}
			},
		},
		{
			headerName: 'Remotes',
			flex: 1,
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<NoteCard>
			{
				init(params: ICellRendererParams<NoteCard, unknown, Context>) {
					this.render(params.context.owner, () => (
						<Show when={params.data?.note.remotes}>
							<ul>
								<Entries of={params.data!.note.remotes}>
									{(nook, v) => (
										<li class='mr-2 inline'>
											<span>
												<Show
													when={v()}
													fallback={
														<>
															<Upload class='inline h-[1em]' />
															/n/{nook}
														</>
													}
												>
													<Show
														when={
															v()!.uploadDate.getTime() <=
															params.data!.note.edited.getTime()
														}
													>
														<Upload class='inline h-[1em]' />
													</Show>
													<a
														class='text-blue-600 underline visited:text-purple-600 hover:text-blue-800'
														title={`Last uploaded at ${v()!.uploadDate.toLocaleString()}`}
														href={
															import.meta.env.VITE_HUB_ORIGIN +
															`/n/` +
															nook +
															`/note/` +
															v()!.remoteNoteId
														}
													>
														/n/{nook}
													</a>
												</Show>
											</span>
										</li>
									)}
								</Entries>
							</ul>
						</Show>
					))
				}
			},
		},
		{
			headerName: 'Tags',
			flex: 1,
			valueGetter: (x) =>
				Array.from(x.data?.card.tags.keys() ?? [])
					.concat(Array.from(x.data?.note.tags.keys() ?? []))
					.join(', '),
		},
	],
	context: {},
	sideBar: {
		position: 'left',
		defaultToolPanel: 'filters',
		toolPanels: [
			{
				id: 'filters',
				labelDefault: 'Filters',
				labelKey: 'filters',
				iconKey: 'filter',
				toolPanel: class
					extends Renderer
					implements IToolPanelComp<NoteCard, Context>
				{
					init(params: IToolPanelParams<NoteCard, Context>) {
						this.render(params.context.owner, () => (
							<FiltersTable
								tagsChanged={(tags) => {
									const q = alterQuery(query(), { tags })
									setQuery(q)
									setExternalQuery(q)
								}}
								templatesChanged={() => {}}
							/>
						))
					}
				},
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
	},
	defaultColDef: { resizable: true },
	getRowId: (params) => params.data.card.id,
	rowSelection: {
		mode: 'multiRow',
		checkboxes: false,
		headerCheckbox: false,
		enableClickSelection: true,
	},
	rowModelType: 'infinite',
	cacheBlockSize,
	suppressMultiSort: true,
	navigateToNextCell: arrowKeyNavigation,
} satisfies CardGridOptions as CardGridOptions

const [query, setQuery] = createSignal('')
const [externalQuery, setExternalQuery] = createSignal('')
const [count, setCount] = createSignal<number>()
const [selectedCount, setSelectedCount] = createSignal<number>(0)
const [showHelp, setHelp] = createSignal(false)

interface Regexes {
	regex: Accessor<RegExp>
	regexLeft: Accessor<RegExp | null>
	regexRight: Accessor<RegExp | null>
	regexBoth: Accessor<RegExp | null>
}

const CardsTable: VoidComponent<{
	readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
	const datasource = {
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
			C.db
				.getCards(
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
						countishWrong || gridApi.isLastRowIndexKnown() === true
							? undefined
							: countish,
					)
					if (p.startRow === 0) {
						gridApi.autoSizeColumns(['Card', 'card.due', 'card.created'])
						if (countish === 0) {
							gridApi.showNoRowsOverlay()
						} else {
							gridApi.hideOverlay()
						}
					}
					setFvHighlight(x.fieldValueHighlight)
					if (countishWrong && gridApi.isLastRowIndexKnown() !== true) {
						const start = performance.now()
						const count = await C.db.getCardsCount(x.searchCache, x.baseQuery)
						const end = performance.now()
						console.log(`Count took ${end - start} ms`, cleanedQuery)
						gridApi.setRowCount(count.c, true)
						setCount(count.c)
					} else if (!countishWrong) {
						setCount(countish)
					}
					if (countishWrong && x.searchCache == null) {
						// asynchronously/nonblockingly build the cache
						C.db.buildCache(x.baseQuery(), cleanedQuery, sort).catch((e) => {
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
	let ref: HTMLDivElement
	let gridApi: GridApi<NoteCard>
	onMount(() => {
		gridApi = createGrid(ref, C.cardGridOptions, {
			regexes: {
				regex,
				regexLeft,
				regexRight,
				regexBoth,
			} satisfies Regexes,
		})
		// eslint-disable-next-line solid/reactivity -- onSelectionChanged shouldn't ever update
		gridApi.setGridOption('onSelectionChanged', (event) => {
			const ncs = event.api.getSelectedRows()
			setSelectedCount(ncs.length)
			props.onSelectionChanged(ncs)
		})
		gridApi.setGridOption('datasource', datasource)
		registerGridUpdate(gridApi, useTableCountContext().noteRowDelta)
	})
	createEffect(
		on(
			[query],
			() => {
				setCount(undefined)
				gridApi.setGridOption('datasource', datasource)
			},
			{
				defer: true,
			},
		),
	)
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
			<div class={`${agGridTheme(theme)} h-full`} ref={ref!} />
		</div>
	)
}

// https://github.com/xh/hoist-react/blob/58ca986275cedfd0b6953ac07a58d1ee937137dd/cmp/grid/impl/RowKeyNavSupport.ts
function arrowKeyNavigation(
	agParams: NavigateToNextCellParams<NoteCard, Context>,
) {
	const agApi = agParams.api
	const { nextCellPosition, previousCellPosition, event, key } = agParams
	const shiftKey = event?.shiftKey ?? false
	const prevIndex = previousCellPosition?.rowIndex ?? null
	const prevNode =
		prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null

	switch (key) {
		case 'ArrowDown':
		case 'ArrowUp':
			if (nextCellPosition != null) {
				const nextIndex = nextCellPosition?.rowIndex ?? null
				const isUp = key === 'ArrowUp'

				// agGrid can weirdly wrap focus when bottom summary present - prevent that
				if (isUp !== nextIndex < prevIndex) return previousCellPosition

				const nextNode = findNextSelectable(nextIndex, isUp, agApi)
				if (nextNode?.rowIndex == null) return previousCellPosition

				nextCellPosition.rowIndex = nextNode.rowIndex

				if (!shiftKey || !(prevNode?.isSelected() ?? false)) {
					// 0) Simple move of selection
					nextNode.setSelected(true, true)
				} else {
					// 1) Extend or shrink multi-selection.
					if (!(nextNode.isSelected() ?? false)) {
						nextNode.setSelected(true, false)
					} else {
						prevNode?.setSelected(false, false)
					}
				}
			}

			return nextCellPosition
		default:
			return null
	}
}

function findNextSelectable(
	index: number,
	isUp: boolean,
	agApi: GridApi<NoteCard>,
) {
	const count = agApi.getDisplayedRowCount()
	while (index >= 0 && index < count) {
		const node = agApi.getDisplayedRowAtIndex(index)
		if (node?.selectable ?? false) return node
		index = index + (isUp ? -1 : 1)
	}
	return null
}

export default CardsTable
