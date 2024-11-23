import { type VoidComponent, type Owner, Show, onMount } from 'solid-js'
import {
	type GridOptions,
	type ICellRendererParams,
	type ICellRendererComp,
	type GridApi,
	type IGetRowsParams,
} from 'ag-grid-community2'
import 'ag-grid-community2/styles/ag-grid.css'
import 'ag-grid-community2/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise2'
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
			headerName: 'Name',
			valueGetter: (row) => row.data?.name,
		},
		{
			headerName: 'Type',
			valueGetter: (row) => startCase(row?.data?.templateType.tag),
		},
		{
			headerName: 'Remotes',
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
	rowSelection: 'multiple',
	rowModelType: 'infinite',
	cacheBlockSize,
	onGridSizeChanged: (event) => {
		event.api.sizeColumnsToFit()
	},
	onFirstDataRendered: (params) => {
		params.api.sizeColumnsToFit()
	},
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
					})
					.catch(() => {
						p.failCallback()
					})
			},
		})
	})
	const [theme] = useThemeContext()
	return <div class={`${agGridTheme(theme)} h-full`} ref={ref!} />
}

export default TemplatesTable
