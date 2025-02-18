import {
	type VoidComponent,
	type Owner,
	createResource,
	createEffect,
	onMount,
} from 'solid-js'
import type {
	GridOptions,
	ICellRendererParams,
	ICellRendererComp,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import type { Plugin } from 'shared-dom/plugin'
import { C } from '../topLevelAwait'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import type { Override } from 'shared/utility'
import { createGrid, Renderer } from '../uiLogic/aggrid'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

type PluginGridOptions = Override<
	GridOptions<Plugin>,
	{ context: Record<string, unknown> }
>

interface Context {
	owner: Owner
}

export const pluginGridOptions = {
	columnDefs: [
		{
			headerName: 'Name',
			valueGetter: (row) => row.data?.name,
		},
		{
			headerName: 'Version',
			valueGetter: (row) => row.data?.version,
		},
		{
			headerName: 'Dependencies',
			valueGetter: (row) => row.data?.dependencies,
		},
		{
			headerName: 'Created',
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<Plugin>
			{
				init(params: ICellRendererParams<Plugin, unknown, Context>) {
					this.render(params.context.owner, () => (
						<relative-time prop:date={params.data?.created} />
					))
				}
			},
		},
		{
			headerName: 'Edited',
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<Plugin>
			{
				init(params: ICellRendererParams<Plugin, unknown, Context>) {
					this.render(params.context.owner, () => (
						<relative-time prop:date={params.data?.edited} />
					))
				}
			},
		},
		{
			headerName: 'Delete',
			cellRenderer: class
				extends Renderer
				implements ICellRendererComp<Plugin>
			{
				init(params: ICellRendererParams<Plugin, unknown, Context>) {
					this.render(params.context.owner, () => (
						<button
							onClick={async () => {
								if (params.data?.name != null) {
									await C.db.deletePlugin(params.data.name)
								} else {
									C.toastError(
										'props.data is null, how did this occur?',
										'props.data is null, how did this occur?',
										params,
									)
								}
							}}
						>
							Delete
						</button>
					))
				}
			},
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
	getRowId: (params) => params.data.name,
	rowModelType: 'clientSide',
} satisfies PluginGridOptions as PluginGridOptions

const PluginsTable: VoidComponent = () => {
	const [theme] = useThemeContext()
	let ref!: HTMLDivElement
	onMount(() => {
		const [plugins] = createResource(async () => await C.db.getPlugins())
		const gridApi = createGrid(ref, C.pluginGridOptions)
		createEffect(() => {
			gridApi.setGridOption('rowData', plugins())
		})
	})
	return <div class={`${agGridTheme(theme)} h-full`} ref={ref} />
}

export default PluginsTable
