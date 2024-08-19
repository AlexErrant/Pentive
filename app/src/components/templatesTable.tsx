import { type VoidComponent, Show, For } from 'solid-js'
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
import { objEntries, type Template, type TemplateId } from 'shared'
import { startCase } from 'lodash-es'
import '@github/relative-time-element'
import { db } from '../db'
import { agGridTheme } from '../topLevelAwait'
import { Upload } from 'shared-dom'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Template>> = [
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
		cellRenderer: (props: ICellRendererParams<Template>) => (
			<Show when={props.data?.remotes}>
				<ul>
					<For each={objEntries(props.data!.remotes)}>
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
												v!.uploadDate.getTime() <= props.data!.edited.getTime()
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
												`/template/` +
												v!.remoteTemplateId
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
]

const getRowId = (params: GetRowIdParams<Template>): TemplateId =>
	params.data.id

const TemplatesTable: VoidComponent<{
	readonly templates: Template[]
	readonly onSelectionChanged: (templates: Template[]) => void
}> = (props) => {
	return (
		<div class={`${agGridTheme()} h-full`}>
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
				rowModelType='infinite'
				onGridReady={onGridReady}
				cacheBlockSize={cacheBlockSize}
				onGridSizeChanged={() => {
					gridRef?.api.sizeColumnsToFit()
				}}
				onSelectionChanged={(event) => {
					const ncs = event.api.getSelectedRows() as Template[]
					props.onSelectionChanged(ncs)
				}}
				onFirstDataRendered={(params) => {
					params.api.sizeColumnsToFit()
				}}
			/>
		</div>
	)
}

export default TemplatesTable

const cacheBlockSize = 100

const onGridReady = ({ api }: GridReadyEvent) => {
	api.setDatasource({
		getRows: (p: IGetRowsParams) => {
			db.getTemplatesInfinitely(p.startRow, cacheBlockSize)
				.then((x) => {
					p.successCallback(x.templates, x.count)
				})
				.catch(() => {
					p.failCallback()
				})
		},
	})
}
