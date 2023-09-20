import { createResource, type VoidComponent } from 'solid-js'
import AgGridSolid, { type AgGridSolidRef } from 'ag-grid-solid'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { type ColDef } from 'ag-grid-community'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import { agGridTheme } from '../globalState'
import { db } from '../db'
import { type TemplateId } from 'shared'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

interface FilterNode {
	searchId: string
	dataPath: string[]
}

const columnDefs: Array<ColDef<FilterNode>> = []

const TagsNodeName = 'Tags'
const TemplatesNodeName = 'Templates'

const FiltersTable: VoidComponent<{
	tagsChanged: (tags: string[]) => void
	templatesChanged: (templates: TemplateId[]) => void
}> = (props) => {
	const [nodes] = createResource(async () => {
		const tags = db.getTags().then((tags) =>
			tags.map(
				(t) =>
					({
						searchId: t,
						dataPath: [TagsNodeName, ...t.split('/')],
					}) satisfies FilterNode,
			),
		)
		const templates = db.getTemplates().then((templates) =>
			templates.map(
				(t) =>
					({
						searchId: t.id,
						dataPath: [TemplatesNodeName, t.name],
					}) satisfies FilterNode,
			),
		)
		return [...(await tags), ...(await templates)]
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
						.map((t) => t.searchId)
					const templates = nodes
						.filter((n) => n.dataPath[0] === TemplatesNodeName)
						.map((t) => t.searchId as TemplateId)
					props.tagsChanged(tags)
					props.templatesChanged(templates)
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
