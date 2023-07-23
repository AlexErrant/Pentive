import { type VoidComponent } from "solid-js"
import AgGridSolid, { type AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import {
  type ICellRendererParams,
  type ColDef,
  type GetRowIdParams,
  type GridReadyEvent,
  type IGetRowsParams,
} from "ag-grid-community"
import { LicenseManager } from "ag-grid-enterprise"
import { type Template, type TemplateId } from "shared"
import _ from "lodash"
import "@github/relative-time-element"
import { db } from "../db"

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Template>> = [
  {
    headerName: "Name",
    valueGetter: (row) => row.data?.name,
  },
  {
    headerName: "Type",
    valueGetter: (row) => _.startCase(row?.data?.templateType.tag),
  },
  {
    headerName: "Created",
    cellRenderer: (props: ICellRendererParams<Template>) => (
      <relative-time date={props.data?.created} />
    ),
  },
  {
    headerName: "Updated",
    cellRenderer: (props: ICellRendererParams<Template>) => (
      <relative-time date={props.data?.updated} />
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
    <div class="ag-theme-alpine h-full">
      <AgGridSolid
        sideBar={{
          toolPanels: [
            {
              id: "columns",
              labelDefault: "Columns",
              labelKey: "columns",
              iconKey: "columns",
              toolPanel: "agColumnsToolPanel",
              toolPanelParams: {
                suppressRowGroups: true,
                suppressValues: true,
                suppressPivotMode: true,
              },
            },
          ],
        }}
        columnDefs={columnDefs}
        ref={gridRef}
        getRowId={getRowId}
        rowSelection="multiple"
        rowModelType="infinite"
        onGridReady={onGridReady}
        cacheBlockSize={cacheBlockSize}
        onSelectionChanged={(event) => {
          const ncs = event.api.getSelectedRows() as Template[]
          props.onSelectionChanged(ncs)
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
