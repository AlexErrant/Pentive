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

interface TagNode {
	id: string
	dataPath: string[]
}

const columnDefs: Array<ColDef<TagNode>> = []

const getRowId = (params: GetRowIdParams<TagNode>) => params.data.id

const FiltersTable: VoidComponent<{
	tagsChanged: (tags: string[]) => void
}> = (props) => {
	const [tags] = createResource(async () => {
		const tags = await db.getTags()
		return tags.map(
			(t) =>
				({
					id: t,
					dataPath: ['Tags', ...t.split('/')],
				}) satisfies TagNode,
		)
	})
	return (
		<div class={agGridTheme() + ' h-full'}>
			<AgGridSolid
				autoGroupColumnDef={{
					headerName: 'Tags',
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
				rowData={tags()}
				rowModelType='clientSide'
				domLayout='autoHeight'
				groupDefaultExpanded={1}
				onGridSizeChanged={() => {
					gridRef?.api.sizeColumnsToFit()
				}}
				onSelectionChanged={(event) => {
					const tags = event.api.getSelectedRows() as TagNode[]
					props.tagsChanged(tags.map((t) => t.id))
				}}
				onFirstDataRendered={(params) => {
					params.api.sizeColumnsToFit()
				}}
				getDataPath={(data: TagNode) => data.dataPath}
				treeData={true}
			/>
		</div>
	)
}

export default FiltersTable
