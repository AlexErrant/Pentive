import { type VoidComponent, Suspense, createResource } from 'solid-js'
import AgGridSolid, { type AgGridSolidRef } from 'ag-grid-solid'
import {
	type ColDef,
	type GetRowIdParams,
	type ICellRendererParams,
} from 'ag-grid-community'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import { type Plugin } from 'shared-dom/plugin'
import { db } from '../db'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { C } from '../topLevelAwait'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Plugin>> = [
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
		cellRenderer: (props: ICellRendererParams<Plugin>) => {
			return <relative-time date={props.data?.created} />
		},
	},
	{
		headerName: 'Edited',
		cellRenderer: (props: ICellRendererParams<Plugin>) => {
			return <relative-time date={props.data?.edited} />
		},
	},
	{
		headerName: 'Delete',
		cellRenderer: (props: ICellRendererParams<Plugin>) => (
			<button
				onClick={async () => {
					if (props.data?.name != null) {
						await db.deletePlugin(props.data.name)
					} else {
						C.toastError(
							'props.data is null, how did this occur?',
							'props.data is null, how did this occur?',
							props,
						)
					}
				}}
			>
				Delete
			</button>
		),
	},
]

const getRowId = (params: GetRowIdParams<Plugin>) => params.data.name

const PluginsTable: VoidComponent = () => {
	const [plugins] = createResource(db.getPlugins, {
		initialValue: [],
	})
	const [theme] = useThemeContext()
	return (
		<Suspense fallback={<span>Loading...</span>}>
			<div class={agGridTheme(theme)}>
				<AgGridSolid
					sideBar={{
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
					}}
					defaultColDef={{ resizable: true }}
					columnDefs={columnDefs}
					ref={gridRef}
					getRowId={getRowId}
					rowSelection='multiple'
					rowModelType='clientSide'
					rowData={plugins()}
					onGridSizeChanged={() => {
						gridRef?.api.sizeColumnsToFit()
					}}
					onFirstDataRendered={(params) => {
						params.api.sizeColumnsToFit()
					}}
					domLayout='autoHeight'
				/>
			</div>
		</Suspense>
	)
}

export default PluginsTable
