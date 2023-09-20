import { createResource, type VoidComponent } from 'solid-js'
import AgGridSolid, { type AgGridSolidRef } from 'ag-grid-solid'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { type ColDef, type GetRowIdParams } from 'ag-grid-community'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import { agGridTheme } from '../globalState'
import { db } from '../db'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

interface FilterNode {
	id: string
	dataPath: string[]
}

const columnDefs: Array<ColDef<FilterNode>> = []

const getRowId = (params: GetRowIdParams<FilterNode>) => params.data.id

const TagsNodeName = 'Tags'

const FiltersTable: VoidComponent<{
	tagsChanged: (tags: string[]) => void
}> = (props) => {
	const [nodes] = createResource(async () => {
		const tags = await db.getTags()
		return tags.map(
			(t) =>
				({
					id: t,
					dataPath: [TagsNodeName, ...t.split('/')],
				}) satisfies FilterNode,
		)
	})
	return (
		<div class={agGridTheme() + ' h-full'}>
			<AgGridSolid
				autoGroupColumnDef={{
					headerName: 'Filters',
					floatingFilter: true,
					filter: 'agTextColumnFilter',
					sortable: true,
					flex: 1,
					cellRendererParams: {
						suppressCount: true,
						checkbox: true,
					},
				}}
				groupSelectsChildren={true}
				columnDefs={columnDefs}
				ref={gridRef}
				getRowId={getRowId}
				rowSelection='multiple'
				rowData={nodes()}
				rowModelType='clientSide'
				domLayout='autoHeight'
				groupDefaultExpanded={2}
				onGridSizeChanged={() => {
					gridRef?.api.sizeColumnsToFit()
				}}
				onSelectionChanged={(event) => {
					const nodes = event.api.getSelectedRows() as FilterNode[]
					const tags = nodes
						.filter((n) => n.dataPath[0] === TagsNodeName)
						.map((t) => t.id)
					props.tagsChanged(tags)
				}}
				onFirstDataRendered={(params) => {
					params.api.sizeColumnsToFit()
				}}
				getDataPath={(data: FilterNode) => data.dataPath}
				treeData={true}
			/>
		</div>
	)
}

export default FiltersTable
