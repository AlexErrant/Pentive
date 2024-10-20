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
import { type WholeDbRtcPublic } from '../sqlite/wholeDbRtc'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import { type PeerJsId, type PeerDisplayName } from 'shared/brand'
import { notEmpty } from 'shared/utility'

export interface Peer {
	id: PeerJsId
	name: PeerDisplayName
	status: 'pending' | 'connected' | 'self' | 'disconnected'
}

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
		cellRenderer: (props: ICellRendererParams<Peer, unknown, Context>) => (
			<Show when={props.data?.status === 'disconnected'}>
				<button
					class='text-black bg-green-300 border-gray-900 rounded-lg border px-2 leading-normal'
					onClick={() => {
						props.context.wdbRtc.connectTo(props.data!.id)
					}}
				>
					Connect
				</button>
			</Show>
		),
	},
]

const getRowId = (params: GetRowIdParams<Peer>): PeerJsId => params.data.id

interface Context {
	wdbRtc: WholeDbRtcPublic
}

const PeersTable: VoidComponent<{
	readonly peers: Peer[]
	readonly updated: Peer[]
	readonly wdbRtc: WholeDbRtcPublic
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
	const [theme] = useThemeContext()
	return (
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
				context={{ wdbRtc: props.wdbRtc } satisfies Context}
				defaultColDef={{ resizable: true }}
				columnDefs={columnDefs}
				ref={gridRef}
				getRowId={getRowId}
				rowSelection='multiple'
				rowModelType='clientSide'
				rowData={props.peers}
				domLayout='autoHeight'
				onGridSizeChanged={() => {
					gridRef?.api.sizeColumnsToFit()
				}}
				onFirstDataRendered={(params) => {
					params.api.sizeColumnsToFit()
				}}
			/>
		</div>
	)
}

export default PeersTable
