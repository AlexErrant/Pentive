import { type VoidComponent, Suspense, createResource } from "solid-js"
import AgGridSolid, { type AgGridSolidRef } from "ag-grid-solid"
import {
  type ColDef,
  type GetRowIdParams,
  type ICellRendererParams,
} from "ag-grid-community"
import { LicenseManager } from "ag-grid-enterprise"
import "@github/relative-time-element"
import { agGridTheme } from "../globalState"
import { type Plugin } from "shared-dom"
import { db } from "../db"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Plugin>> = [
  {
    headerName: "Name",
    valueGetter: (row) => row.data?.name,
  },
  {
    headerName: "Version",
    valueGetter: (row) => row.data?.version,
  },
  {
    headerName: "Dependencies",
    valueGetter: (row) => row.data?.dependencies,
  },
  {
    headerName: "Created",
    cellRenderer: (props: ICellRendererParams<Plugin>) => {
      return <relative-time date={props.data?.created} />
    },
  },
  {
    headerName: "Updated",
    cellRenderer: (props: ICellRendererParams<Plugin>) => {
      return <relative-time date={props.data?.updated} />
    },
  },
]

const getRowId = (params: GetRowIdParams<Plugin>) => params.data.name

const PluginsTable: VoidComponent = () => {
  const [plugins] = createResource(db.getPlugins, {
    initialValue: [],
  })
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <div class={agGridTheme()}>
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
          rowModelType="clientSide"
          rowData={plugins()}
          domLayout="autoHeight"
        />
      </div>
    </Suspense>
  )
}

export default PluginsTable
