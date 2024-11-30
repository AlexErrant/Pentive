import {
	type VoidComponent,
	type Owner,
	Show,
	onMount,
	createEffect,
	on,
} from 'solid-js'
import {
	type GridOptions,
	type ICellRendererParams,
	type ICellRendererComp,
	type GridApi,
	type IGetRowsParams,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise'
import { startCase } from 'lodash-es'
import '@github/relative-time-element'
import { Upload } from 'shared-dom/icons'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import { type Template } from 'shared/domain/template'
import { Entries } from '@solid-primitives/keyed'
import './registry'
import { C } from '../topLevelAwait'
import { type Override } from 'shared/utility'
import { createGrid, Renderer } from '../uiLogic/aggrid'
import { useTableCountContext } from './tableCountContext'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

interface Context {
	owner: Owner
}

type TemplateGridOptions = Override<
	GridOptions<Template>,
	{ context: Record<string, unknown> }
>

const cacheBlockSize = 100

export const templateGridOptions = {
	columnDefs: [
		{
			colId: 'id',
			field: 'id',
			hide: true,
		},
		{
			colId: 'name',
			field: 'name',
		},
		{
			colId: 'Type',
			headerName: 'Type',
			valueGetter: (row) => startCase(row?.data?.templateType.tag),
		},
		{
			headerName: 'Remotes',
			flex: 1,
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<Template>
			{
				init(params: ICellRendererParams<Template, unknown, Context>) {
					this.render(params.context.owner, () => (
						<Show when={params.data?.remotes}>
							<ul>
								<Entries of={params.data!.remotes}>
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
															params.data!.edited.getTime()
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
															`/template/` +
															v()!.remoteTemplateId
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
			headerName: 'Created',
			hide: true,
			cellRenderer: (props: ICellRendererParams<Template>) => (
				<relative-time date={props.data?.created} />
			),
		},
		{
			headerName: 'Edited',
			hide: true,
			cellRenderer: (props: ICellRendererParams<Template>) => (
				<relative-time date={props.data?.edited} />
			),
		},
	],
	context: {},
	sideBar: {
		position: 'left',
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
	},
	defaultColDef: { resizable: true },
	getRowId: (params) => params.data.id,
	rowModelType: 'infinite',
	rowSelection: {
		mode: 'multiRow',
		checkboxes: false,
		headerCheckbox: false,
		enableClickSelection: true,
	},
	cacheBlockSize,
} satisfies TemplateGridOptions as TemplateGridOptions

const TemplatesTable: VoidComponent<{
	readonly onSelectionChanged: (templates: Template[]) => void
}> = (props) => {
	let ref: HTMLDivElement
	let gridApi: GridApi<Template>
	onMount(() => {
		gridApi = createGrid(ref, C.templateGridOptions)
		// eslint-disable-next-line solid/reactivity -- onSelectionChanged shouldn't ever update
		gridApi.setGridOption('onSelectionChanged', (event) => {
			const ncs = event.api.getSelectedRows()
			props.onSelectionChanged(ncs)
		})
		gridApi.setGridOption('datasource', {
			getRows: (p: IGetRowsParams) => {
				C.db
					.getTemplatesInfinitely(p.startRow, cacheBlockSize)
					.then((x) => {
						p.successCallback(x.templates, x.count)
						gridApi.autoSizeColumns(['name', 'Type'])
					})
					.catch(() => {
						p.failCallback()
					})
			},
		})
	})
	const [templateRowDelta, setTemplateRowDelta] =
		useTableCountContext().templateRowDelta
	createEffect(
		on(
			templateRowDelta,
			(templateRowDelta) => {
				if (templateRowDelta != null) {
					// This code is copied from the "Using Cache API Methods" example
					// https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/#example-using-cache-api-methods
					// https://codesandbox.io/p/sandbox/v6klrp

					// if the data has stopped looking for the last row, then we need to adjust the
					// row count to allow for the extra data, otherwise the grid will not allow scrolling
					// to the last row. eg if we have 1000 rows, scroll all the way to the bottom (so
					// maxRowFound=true), and then add 5 rows, the rowCount needs to be adjusted
					// to 1005, so grid can scroll to the end. the grid does NOT do this for you in the
					// refreshInfiniteCache() method, as this would be assuming you want to do it which
					// is not true, maybe the row count is constant and you just want to refresh the details.
					const maxRowFound = gridApi.isLastRowIndexKnown()
					if (maxRowFound ?? false) {
						const rowCount = gridApi.getDisplayedRowCount()
						gridApi.setRowCount(rowCount + templateRowDelta)
					}
					gridApi.refreshInfiniteCache()
					setTemplateRowDelta(undefined) // "unset" add so we can listen to new changes
				}
			},
			{ defer: true },
		),
	)
	const [theme] = useThemeContext()
	return <div class={`${agGridTheme(theme)} h-full`} ref={ref!} />
}

export default TemplatesTable
