import { createEffect, on, Show, type VoidComponent } from 'solid-js'
import AgGridSolid, { type AgGridSolidRef } from 'ag-grid-solid'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import {
	type GridApi,
	type ColDef,
	type GetRowIdParams,
	type ICellRendererParams,
} from 'ag-grid-community'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import { notEmpty, type PeerJsId } from 'shared'
import { type Peer } from '../pages/peers'
import { getCrRtc } from '../sqlite/crsqlite'
import { agGridTheme } from '../globalState'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Peer>> = [
	{
		headerName: 'Id',
		valueGetter: (row) => row.data?.id,
	},
	{
		headerName: 'Name',
		valueGetter: (row) => row.data?.name,
	},
	{
		headerName: 'Status',
		valueGetter: (row) => row.data?.status,
	},
	{
		cellRenderer: (props: ICellRendererParams<Peer>) => (
			<Show when={props.data?.status === 'disconnected'}>
				<button
					class='text-black bg-green-300 border-gray-900 rounded-lg border px-2 leading-normal'
					onClick={async () => {
						const rtc = await getCrRtc()
						rtc.connectTo(props.data!.id)
					}}
				>
					Connect
				</button>
			</Show>
		),
	},
]

const getRowId = (params: GetRowIdParams<Peer>): PeerJsId => params.data.id

const PeersTable: VoidComponent<{
	readonly peers: Peer[]
	readonly updated: Peer[]
}> = (props) => {
	createEffect(
		on(
			() => props.updated,
			() => {
				const gridApi = gridRef?.api as GridApi<Peer> | undefined
				gridApi?.applyTransaction({
					update: props.updated
						.map((c) => {
							const node = gridApi?.getRowNode(c.id)
							if (node == null) return null
							return c
						})
						.filter(notEmpty),
				})
			},
		),
	)
	return (
		<div class={agGridTheme()}>
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
				defaultColDef={{ resizable: true }}
				columnDefs={columnDefs}
				ref={gridRef}
				getRowId={getRowId}
				rowSelection='multiple'
				rowModelType='clientSide'
				rowData={props.peers}
				domLayout='autoHeight'
				onFirstDataRendered={(params) => {
					params.api.sizeColumnsToFit()
				}}
			/>
		</div>
	)
}

export default PeersTable
