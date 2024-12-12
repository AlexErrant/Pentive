import {
	batch,
	createEffect,
	createResource,
	onMount,
	type VoidComponent,
} from 'solid-js'
import {
	type GridOptions,
	type GridApi,
	type IGroupCellRendererParams,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { LicenseManager } from 'ag-grid-enterprise'
import '@github/relative-time-element'
import { type TemplateId } from 'shared/brand'
import { agGridTheme, useThemeContext } from 'shared-dom/themeSelector'
import { C } from '../topLevelAwait'
import { type Override } from 'shared/utility'
import { createGrid } from '../uiLogic/aggrid'

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

type FilterGridOptions = Override<
	GridOptions<FilterNode>,
	{ context: Record<string, unknown> }
>

export const filterGridOptions = {
	columnDefs: [],
	context: {},
	autoGroupColumnDef: {
		headerName: 'Filters',
		floatingFilter: true,
		filter: 'agTextColumnFilter',
		sortable: true,
		flex: 1,
		cellRendererParams: {
			suppressCount: true,
			checkbox: true,
		} satisfies IGroupCellRendererParams<FilterNode>,
		field: 'name',
	},
	rowSelection: {
		mode: 'multiRow',
		groupSelects: 'filteredDescendants',
		headerCheckbox: false,
		enableClickSelection: true,
		checkboxes: false,
		hideDisabledCheckboxes: true,
		enableSelectionWithoutKeys: true,
	},
	rowModelType: 'clientSide',
	groupDefaultExpanded: 2,
	getDataPath: (data) => data.dataPath,
	treeData: true,
} satisfies FilterGridOptions as FilterGridOptions

export interface FilterNode {
	searchId: string
	name: string
	dataPath: string[]
}

const TagsNodeName = 'Tags'
const TemplatesNodeName = 'Templates'

const FiltersTable: VoidComponent<{
	tagsChanged: (tags: string[]) => void
	templatesChanged: (templates: TemplateId[]) => void
}> = (props) => {
	let ref: HTMLDivElement
	let gridApi: GridApi<FilterNode>
	onMount(() => {
		gridApi = createGrid(ref, C.filterGridOptions)
		// eslint-disable-next-line solid/reactivity
		gridApi.setGridOption('onSelectionChanged', () => {
			const nodes = gridApi.getSelectedRows()
			const tags = nodes
				.filter((n) => n.dataPath[0] === TagsNodeName)
				.map((t) => t.searchId)
			const templates = nodes
				.filter((n) => n.dataPath[0] === TemplatesNodeName)
				.map((t) => t.searchId as TemplateId)
			batch(() => {
				props.tagsChanged(tags)
				props.templatesChanged(templates)
			})
		})
	})
	const [nodes] = createResource(async () => {
		const tags = C.db.getTags().then((tags) =>
			tags.map((t) => {
				const dataPath = [TagsNodeName, ...t.split('/')]
				return {
					searchId: t,
					dataPath,
					name: dataPath.at(-1)!,
				} satisfies FilterNode
			}),
		)
		const templates = C.db.getTemplates().then((templates) =>
			templates.map(
				(t) =>
					({
						searchId: t.id,
						dataPath: [TemplatesNodeName, t.id],
						name: t.name,
					}) satisfies FilterNode,
			),
		)
		return [...(await tags), ...(await templates)]
	})
	createEffect(() => {
		gridApi.setGridOption('rowData', nodes())
	})
	const [theme] = useThemeContext()
	return <div class={`${agGridTheme(theme)} h-full`} ref={ref!} />
}

export default FiltersTable
